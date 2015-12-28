var Mongo = require('mongodb');
var UUID = require('node-uuid');
var Promise = require("bluebird");
var config = require('../util/config');
var util = require("../util/util");

var db;

exports.prepDB = function(){
  var mongoServer = new Mongo.Server(config.mongoHost, config.mongoPort, {auto_reconnect:true});
  db = new Mongo.Db(config.mongoDbName, mongoServer);

  return util.repeatingMongoConnection(db);
};

var Status = {
  Pending:'PENDING',
  Rejected:'REJECTED',
  Published:'PUBLISHED',
  Archived:'ARCHIVED',
  fromString:function(name){
    name = name.toLowerCase();
    if(name == 'pending'){
      return this.Pending;
    } else if(name == 'rejected'){
      return this.Rejected;
    } else if(name == 'published'){
      return this.Published;
    } else if(name == 'archived'){
      return this.Archived;
    } else{
      throw "Unknown status name";
    }
  }
};

exports.Status = Status;

var IngestedStory = function(id, story, status){
  this.id = id;
  this.status = status;
  this.details = {
    'headline':story.headline,
    'link':story.link,
    'note':story.note,
    'metadata':story.metadata || {ingestionTime:new Date().getTime()}
  };
};

var MongoStory = function(ingested){
  this._id = ingested.id;
  this.details = ingested.details;
};

var IngestionStatus = function(id, status){
  this.id = id;
  this.status = status;
};

exports.findAll = function(collectionName){
  return new Promise(function(resolve, reject){
    db.collection(collectionName.toLowerCase(), function(err, collection){
      if(err || collection == null){
        console.trace(err);
        reject({'error':'An error has occurred'});
      } else{
        collection.find().toArray(function(err, items){
          if(err || items == null){
            console.trace(err);
            reject({'error':'Could not find any stories'});
          } else{
            items = items.map(function(item){
              return new IngestedStory(item._id, item.details);
            })
            resolve(items);
          }
        });
      }
    });
  });
};

exports.findById = function(collections, id){
  if(collections.constructor != Array){ //force it into an array format
    collections = [collections];
  }

  return Promise.any(collections.map(function(collectionName){ //query each collection that might have this story in it
      return new Promise(function(resolve, reject){
        db.collection(collectionName.toLowerCase(), function(err, collection){
          if(err || collection == null){
            resolve(); //empty resolve so that the call to promise.all will work correctly
          } else{
            collection.findOne({'_id':id}, function(err, item){
              if(err || item == null){
                reject({'error':'Could not find story with id ' + id});
              } else{
                var out = new IngestedStory(item._id, item.details);
                out.status = Status.fromString(collectionName);
                resolve(out);
              }
            });
          }
        });
      });
    }));
};

exports.findExpired = function(cutoff){
  return new Promise(function(resolve, reject){
    db.collection(Status.Published.toLowerCase(), function(err, collection){
      if(err || collection == null){
        console.trace(err);
        reject({'error':'An error has occurred'});
      } else{
        collection.find({'details.metadata.expirationTime': {'$lt': cutoff}}).toArray(function(err, items){
          if(err || items == null){
            if(err){
              console.trace(err);
            }
            reject({'error':'Could not find any stories'});
          } else{
            items = items.map(function(item){
              return new IngestedStory(item._id, item.details);
            });
            resolve(items);
          }
        });
      }
    });
  });
};

exports.addStory = function(collectionName, story, id){
  id = id || UUID.v4();
  return new Promise(function(resolve, reject){
    db.collection(collectionName.toLowerCase(), function(err, collection){
      collection.insert(
        new MongoStory(
          new IngestedStory(id, story)
        ),
        {safe:true},
        function(err, response){
          if(err){
            console.trace(err);
            reject({'error':'An error has occurred'});
          } else{
            resolve(new IngestionStatus(id, Status.Pending));
          }
        }
      );
    });
  });
}

exports.updateStory = function(collectionName, story){
  return new Promise(function(resolve, reject){
    db.collection(collectionName.toLowerCase(), function(err, collection){
      collection.save(
        new MongoStory(
          story
        ),
        {safe:true},
        function(err, response){
          if(err){
            console.trace(err);
            rest.reject({'error':'An error has occurred'});
          } else{
            resolve(new IngestionStatus(story.id, Status.Pending));
          }
        }
      );
    });
  });
}

exports.deleteStory = function(collectionName, id){
  return new Promise(function(resolve, reject){
    db.collection(collectionName.toLowerCase(), function(err, collection){
      if(err || collection == null){
        console.trace(err);
        reject({'error':'An error has occurred'});
      } else{
        collection.remove({'_id':id}, {safe:true}, function(err, response){
          if(err){
            console.trace(err);
            reject({'error':'Could not delete story with id ' + id});
          } else{
            resolve();
          }
        });
      }
    });
  });
};
