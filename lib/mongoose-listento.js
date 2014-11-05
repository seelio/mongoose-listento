var _ = require('underscore');

module.exports = function listenToPlugin(schema, mongoose) {
  mongoose = mongoose || require('mongoose');
  var _model;

  // Cache model object
  schema.on('init', function(model) {
    _model = model;
  });

  // Returns a properly bound listener function
  var _bind = function _bind(model, listener) {
    return function() {
      listener.apply(model, arguments);
    };
  };

  // Returns a model object from a string
  var _getModel = function _getModel(model) {
    if ('string' === typeof model) {
      model = mongoose.model(model);
    }
    return model;
  };

  // Inversion-of-control versions of `on` and `once`. Tell *this* schema to
  // listen to an event in another model.
  schema.listenTo = function listenTo(model, event, listener) {
    model = _getModel(model);
    model.schema.on(event, _bind(_model, listener));
    return this;
  };

  schema.listenToOnce = function listenToOnce(model, event, listener) {
    model = _getModel(model);
    model.schema.once(event, _bind(_model, listener));
    return this;
  };

  // Find listener and get the correct reference
  var _getListener = function _getListener(model, event, listener) {
    if (_.isFunction(model.schema._events[event])) {
      if (listener.toString() === model.schema._events[event].toString()) {
        return model.schema._events[event];
      }
    } else if (_.isArray(model.schema._events[event])) {
      return _.find(model.schema._events[event], function(l) {
        return listener.toString() === l.toString();
      });
    }
    return listener;
  };

  // Tell this schema to stop listening to either specific events or to every
  // object it's currently listening to.
  schema.stopListening = function stopListening(model, event, listener) {
    model = _getModel(model);
    if (event && listener) {
      // Wrap listener callback for comparison
      listener = _getListener(model, event, _bind(_model, listener));
      // Remove listener based on function reference
      model.schema.removeListener(event, listener);
    } else {
      // Remove all listeners
      model.schema.removeAllListeners(event);
    }
    return this;
  };

  // Track modified attributes after a `Model#save` callback
  schema.method('__wasModified', function __wasModified(path) {
    if (!this.__isModified) {
      return false;
    } else if (!path) {
      return !!_.size(this.__isModified);
    } else if (_.has(this.__isModified, path)) {
      return this.__isModified[path];
    } else {
      return false;
    }
  });

  schema.pre('save', function(next, callback) {
    if (this.isNew) {
      // Track `isNew` flag
      this.__wasNew = true;
      return next();
    }
    this.__isModified = {};
    // Track all modified attributes
    var _this = this;
    this.schema.eachPath(function(path) {
      _this.__isModified[path] = _this.isModified(path);
    });
    next();
  });

  // Emit events for model and all changed attributes
  schema.post('save', function(model, numberAffected) {
    if (model.__wasNew) {
      delete model.__wasNew;
      // Emit `add` when a document is added to the collection
      model.schema.emit('add', model);
    } else if (model.__wasModified()) {
      // Emit `change` when a document is updated
      model.schema.emit('change', model);
      model.schema.eachPath(function(path) {
        if (model.__wasModified(path)) {
          // Emit `change:[attribute]` when an attribute is updated
          model.schema.emit('change:' + path, model, model[path]);
        }
      });
      delete model.__isModified;
    }
  });

  // Emit `remove` event for deleted models
  schema.post('remove', function(model) {
    model.schema.emit('remove', model);
  });
};
