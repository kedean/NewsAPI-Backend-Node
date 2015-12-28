var config = require("../util/config"),
    stories = require("../routes/stories.js"),
    Promise = require("bluebird"),
    util = require("../util/util");

exports.archiveStory = function(story){
  return new Promise(function(resolve, reject){
    stories.addStory(stories.Status.Archived, story.details, story.id).then(
      function(){
        stories.deleteStory(stories.Status.Published, story.id).then(function(){
          resolve();
        }, function(err){
          console.trace(err);
          reject();
        });
      }, function(err){
        console.trace(err);
        reject();
      }
    );
  });
};

exports.expirationCheck = function(){
  // TODO: callback hell! Is there a better way to organize this?
  return new Promise(function(resolve, reject){
    stories.findExpired(new Date().getTime()).then(function(expired){
      var archivalProcesses = [];
      expired.forEach(function(story){
        console.log("Archiving story with id " + story.id);
        archivalProcesses.push(exports.archiveStory(story));
      });

      if(archivalProcesses.length > 0){
        Promise.all(archivalProcesses).then(resolve, resolve);
      } else{
        resolve();
      }
    }, resolve);
  });
};

//start up the engine, it'll keep itself going with setTimeout
exports.start = function(){
  stories.prepDB().then(function(){
    util.runPeriodically(exports.expirationCheck, config.expirationInterval);
    console.log("Archival engine online");
  });
};
