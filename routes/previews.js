var Mongo = require('mongodb');
var Deferred = require("promised-io/promise").Deferred;
var config = require('../config');

var mongoServer = new Mongo.Server(config.mongoHost, config.mongoPort, {auto_reconnect:true});
var db = new Mongo.Db(config.mongoDbName, mongoServer);
var collectionName = 'screenshot';

var Preview = function(id, imageData){
  this._id = id;
  this.data = imageData;
};

var dbPromise = new Deferred();
exports.ready = dbPromise.promise;

db.open(function(err, db){
  if(!err){
    console.log("Connected to the 'news-api' database");
    dbPromise.resolve();
  }
});

exports.findById = function(id) {
  var result = new Deferred();
  db.collection(collectionName, function(err, collection){
    if(err || collection == null){
      result.reject({"error":"An error has occurred"});
    } else{
      collection.findOne({'_id':id}, function(err, item){
        if(err || item == null){
          result.reject({"error":"Could not find preview with id '" + id + "'"});
        } else{
          result.resolve(item);
        }
      });
    }
  });
  return result.promise;
};

exports.addPreview = function(link, imageData){
  var result = new Deferred();

  db.collection(collectionName, function(err, collection){
    collection.save(
      new Preview(link, imageData),
      {safe:true},
      function(err, response){
        if(err){
          console.error(err);
          result.reject({'error':'Error generating preview'});
        } else{
          result.resolve();
        }
      }
    );
  });

  return result.promise;
}
