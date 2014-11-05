Mongoose listenTo
=================

[Mongoose listenTo](https://github.com/seelio/mongoose-listento) is a
[mongoose](http://mongoosejs.com/) plugin that tells a schema to listen to
events from other models. This module is heavily based on
[Backbone.js Events](http://backbonejs.org/#Events).

Usage
-----
After defining your schema, load the plugin:
```javascript
var listenTo = require('mongoose-listento');
var MySchema = new mongoose.Schema({ ... });
MySchema.plugin(listenTo);
```

Now you are ready to start listening to models from your schema in a way similar
to using `pre` and `post` hooks:
```javascript
MySchema.listenTo(OtherModel, 'add', function(otherModelInstance) {
  // `this` is bound to MySchema's Model
});
```

This plugin provides the following schema methods:

* `listenTo`: Inversion-of-control version of `on`. Tell *this* schema to listen to an event in another model.
* `listenToOnce`: Inversion-of-control version of `once`. Tell *this* schema to listen once to an event in another model.
* `stopListening`: Tell this schema to stop listening to either specific events or to every object it's currently listening to.

You can pass either the `Model` object, or the `"Model"` name to the methods
above and the plugin will automatically use the correct model. This allows for
more flexible decoupling of models within your code.

You can emit any custom event from within the schema (or from the model itself
by calling `MyModel.schema.emit( ... )`). By default, this plugin emits the
following events:

* `add`: When a new model is saved to the database.
* `change`: When a model is updated.
* `change:[attribute]`: When a model attribute is updated. Sends specific attribute to the callback.
* `remove`: When a model is removed from the database.
