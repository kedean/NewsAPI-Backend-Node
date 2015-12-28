var config = require("../util/config"),
    stories = require("../routes/stories.js"),
    promise = require("promised-io/promise"),
    util = require("../util/util");

exports.expirationCheck = function(){
  // TODO: callback hell! Is there a better way to organize this?
  var result = new promise.Deferred();
  stories.findExpired(new Date().getTime()).then(function(expired){
    var archivalProcesses = [];
    expired.forEach(function(story){
      console.log("Archiving story with id " + story.id);
      var archiveDeferment = new promise.Deferred();
      stories.addStory(stories.Status.Archived, story.details, story.id).then(function(){
        stories.deleteStory(stories.Status.Published, story.id).then(function(){
          archiveDeferment.resolve();
        }, function(err){
          console.trace(err);
          archiveDeferment.reject();
        });
      }, function(err){
        console.trace(err);
        archiveDeferment.reject();
      });
      archivalProcesses.push(archiveDeferment.promise);
    });

    if(archivalProcesses.length > 0){
      promise.all(archivalProcesses).then(result.resolve, result.resolve);
    } else{
      result.resolve();
    }
  }, result.resolve);

  return result.promise;
};

//start up the engine, it'll keep itself going with setTimeout
exports.start = function(){
  stories.prepDB().then(function(){
    util.runPeriodically(exports.expirationCheck, config.expirationInterval);
    console.log("Archival engine online");
  });
};
