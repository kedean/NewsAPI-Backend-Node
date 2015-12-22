var Mongo = require('mongodb');
var UUID = require('node-uuid');
var Deferred = require("promised-io/promise").Deferred;
var promise = require("promised-io/promise");
var config = require('../util/config');

var db;

exports.prepDB = function(){
  var mongoServer = new Mongo.Server(config.mongoHost, config.mongoPort, {auto_reconnect:true});
  db = new Mongo.Db(config.mongoDbName, mongoServer);
  var dbPromise = new Deferred();
  db.open(function(err, db){
    if(!err){
      console.log("Connected to the 'news-api' database");
      dbPromise.resolve();
    }
  });
  return dbPromise.promise;
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
  var result = new Deferred();
  db.collection(collectionName.toLowerCase(), function(err, collection){
    if(err || collection == null){
      console.log(err);
      result.reject({'error':'An error has occurred'});
    } else{
      collection.find().toArray(function(err, items){
        if(err || items == null){
          console.log(err);
          result.reject({'error':'Could not find any stories'});
        } else{
          items = items.map(function(item){
            return new IngestedStory(item._id, item.details);
          })
          result.resolve(items);
        }
      });
    }
  });
  return result.promise;
};

exports.findById = function(collections, id){
  if(collections.constructor != Array){ //force it into an array format
    collections = [collections];
  }

  var result = new Deferred();

  promise.all(collections.map(function(collectionName){ //query each collection that might have this story in it
    var subResult = new Deferred();
    db.collection(collectionName.toLowerCase(), function(err, collection){
      if(err || collection == null){
        subResult.resolve(); //empty resolve so that the call to promise.all will work correctly
      } else{
        collection.findOne({'_id':id}, function(err, item){
          if(err || item == null){
            subResult.resolve();
          } else{
            var out = new IngestedStory(item._id, item.details);
            out.status = Status.fromString(collectionName);
            subResult.resolve(out);
          }
        });
      }
    });
    return subResult.promise;
  })).then(function(searches){ //join up all of the queries, determine if exactly one contained the story. If more than one, something went very wrong
    searches = searches.filter(function(item){return item != undefined;});

    if(searches.length == 0){
      result.reject({'error':'Could not find story with id ' + id});
    } else if(searches.length > 1){
      console.error("Multiple items found with id " + id);
      result.reject({'error':'Internal Server Error'});
    } else{
      result.resolve(searches[0]);
    }
  });

  return result.promise;
};

exports.findExpired = function(cutoff){
  var result = new Deferred();
  db.collection(Status.Published.toLowerCase(), function(err, collection){
    if(err || collection == null){
      console.log(err);
      result.reject({'error':'An error has occurred'});
    } else{
      collection.find({'details.metadata.expirationTime': {$lt: cutoff}}).toArray(function(err, items){
        if(err || items == null){
          console.log(err);
          result.reject({'error':'Could not find any stories'});
        } else{
          items = items.map(function(item){
            return new IngestedStory(item._id, item.details);
          });
          result.resolve(items);
        }
      });
    }
  });
  return result.promise;
};

exports.addStory = function(collectionName, story, id){
  id = id || UUID.v4();
  var result = new Deferred();

  db.collection(collectionName.toLowerCase(), function(err, collection){
    collection.insert(
      new MongoStory(
        new IngestedStory(id, story)
      ),
      {safe:true},
      function(err, response){
        if(err){
          console.error(err);
          result.reject({'error':'An error has occurred'});
        } else{
          result.resolve(new IngestionStatus(id, Status.Pending));
        }
      }
    );
  });

  return result.promise;
}

exports.updateStory = function(collectionName, story){
  var result = new Deferred();

  db.collection(collectionName.toLowerCase(), function(err, collection){
    collection.save(
      new MongoStory(
        story
      ),
      {safe:true},
      function(err, response){
        if(err){
          console.error(err);
          result.reject({'error':'An error has occurred'});
        } else{
          result.resolve(new IngestionStatus(story.id, Status.Pending));
        }
      }
    );
  });

  return result.promise;
}

exports.deleteStory = function(collectionName, id){
  var result = new Deferred();

  db.collection(collectionName.toLowerCase(), function(err, collection){
    if(err || collection == null){
      result.reject({'error':'An error has occurred'});
      console.error(err);
    } else{
      collection.remove({'_id':id}, {safe:true}, function(err, response){
        if(err){
          console.error(err);
          result.reject({'error':'Could not delete story with id ' + id});
        } else{
          result.resolve();
        }
      });
    }
  });

  return result;
};
