var expect = require('chai').expect;
var mongoose = require('mongoose');
var listento = require('../lib/mongoose-listento');
var _ = require('underscore');

var StudentSchema, Student, student, UniversitySchema, University, university;
describe('Mongoose ListenTo plugin', function() {
  before(function(done) {
    // Connect to new test database
    mongoose.connect('mongodb://localhost/mongoose-listento-test', done);
  });

  before(function() {
    // Define schemas
    StudentSchema = mongoose.Schema({ name: String, _university: {
      type: mongoose.Schema.ObjectId, ref: 'University'
    }});
    UniversitySchema = mongoose.Schema({ name: String, city: String, departments: [String] });
  });

  before(function() {
    // Add plugin
    StudentSchema.plugin(listento);
    UniversitySchema.plugin(listento);
  });

  before(function() {
    // Instantiate models
    Student = mongoose.model('Student', StudentSchema);
    University = mongoose.model('University', UniversitySchema);
  });

  it('should wait for a model to instantiate before binding listener', function(done) {
    UniversitySchema.listenToOnce('Later', 'add', function(l) {
      expect(this).to.equal(University);
      expect(l).to.be.an.instanceof(Later);
      done();
    });
    var LaterSchema = mongoose.Schema({});
    LaterSchema.plugin(listento);
    var Later = mongoose.model('Later', LaterSchema);
    process.nextTick(function() {
      (new Later()).save();
    });
  });

  it('should create a new model and trigger an `add` event', function(done) {
    StudentSchema.listenToOnce('University', 'add', function(u) {
      expect(this).to.equal(Student);
      expect(u).to.be.an.instanceof(University);
      expect(u.name).to.equal('University of Michigan');
      expect(u.city).to.equal('Ann Arbor');
      done();
    });
    university = new University({name: 'University of Michigan', city: 'Ann Arbor'});
    university.save();
  });

  it('should create model and trigger an `add` event', function(done) {
    UniversitySchema.listenToOnce('Student', 'add', function(s) {
      expect(this).to.equal(University);
      expect(s).to.be.an.instanceof(Student);
      expect(s.name).to.equal('Victor');
      expect(s._university).to.equal(university._id);
      done();
    });
    student = new Student({name: 'Victor', _university: university._id});
    student.save();
  });

  it('should update model and trigger `change` events', function(done) {
    var remaining = 2;
    StudentSchema.listenTo('University', 'change', function(u) {
      expect(this).to.equal(Student);
      expect(u).to.be.an.instanceof(University);
      expect(u.city).to.equal('Ann Arbor, Michigan');
      if (--remaining === 0) {
        StudentSchema.stopListening(University, 'change');
        done();
      }
    });
    university.city = 'Ann Arbor, Michigan';
    university.save(function() {
      university.name = 'U of M';
      university.save();
    });
  });

  it('should update model and trigger a `change:[attribute]` event', function(done) {
    UniversitySchema.listenToOnce('Student', 'change:name', function(s, name) {
      expect(this).to.equal(University);
      expect(s).to.be.an.instanceof(Student);
      expect(s.name).to.equal('Victor Kareh');
      expect(s._university).to.equal(university._id);
      done();
    });
    student.name = 'Victor Kareh';
    student.save();
  });

  it('should stop listening to an event', function(done) {
    var _fail = function() {
      expect(true).to.be(false);
    };
    StudentSchema.listenTo('University', 'add', _fail);
    StudentSchema.stopListening('University', 'add', _fail);
    university = new University({name: 'MIT', city: 'Cambridge, Massachusetts'});
    university.save(done);
  });

  it('should listen to custom events', function(done) {
    StudentSchema.listenTo('University', 'foobar', function(u, foo) {
      expect(this).to.equal(Student);
      expect(u).to.be.an.instanceof(University);
      expect(foo).to.equal('bar');
      done();
    });
    UniversitySchema.emit('foobar', university, 'bar');
  });

  it('should delete a model and trigger a `remove` event', function(done) {
    StudentSchema.listenToOnce('University', 'remove', function(u) {
      expect(this).to.equal(Student);
      expect(u).to.be.an.instanceof(University);
      expect(u._id).to.equal(university._id);
      University.count({_id: u._id}, function(err, count) {
        expect(count).to.equal(0);
        done(err);
      });
    });
    university.remove();
  });

  after(function(done) {
    // Drop test database
    mongoose.connection.db.dropDatabase(done);
  });
});
