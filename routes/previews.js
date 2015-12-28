var Mongo = require('mongodb');
var Promise = require("bluebird");
var config = require('../util/config');
var util = require("../util/util");
var collectionName = 'screenshot';

var Preview = function(id, imageData){
  this._id = id;
  this.data = imageData;
};

var db;

exports.prepDB = function(){
  var mongoServer = new Mongo.Server(config.mongoHost, config.mongoPort, {auto_reconnect:true});
  db = new Mongo.Db(config.mongoDbName, mongoServer);

  return util.repeatingMongoConnection(db);
};

exports.findById = function(id) {
  return new Promise(function(resolve, reject){
    db.collection(collectionName, function(err, collection){
      if(err || collection == null){
        console.trace(err);
        reject({"error":"An error has occurred"});
      } else{
        collection.findOne({'_id':id}, function(err, item){
          if(err || item == null){
            console.trace(err);
            reject({"error":"Could not find preview with id '" + id + "'"});
          } else{
            resolve(item);
          }
        });
      }
    });
  });
};

exports.addPreview = function(link, imageData){
  return new Promise(function(resolve, reject){
    db.collection(collectionName, function(err, collection){
      collection.save(
        new Preview(link, imageData),
        {safe:true},
        function(err, response){
          if(err){
            console.trace(err);
            reject({'error':'Error generating preview'});
          } else{
            resolve();
          }
        }
      );
    });
  });
}
