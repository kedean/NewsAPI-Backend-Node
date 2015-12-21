var config = require("./config"),
    stories = require("./routes/stories.js"),
    promise = require("promised-io/promise");

exports.expirationCheck = function(){
  // TODO: callback hell! Is there a better way to organize this?
  stories.findExpired(new Date().getTime()).then(function(expired){
    var archivalProcesses = [];
    expired.forEach(function(story){
      console.log("Archiving story with id " + story.id);
      var archiveDeferment = new promise.Deferred();
      stories.addStory(stories.Status.Archived, story.details, story.id).then(function(){
        stories.deleteStory(stories.Status.Published, story.id).then(function(){
          archiveDeferment.resolve();
        }, function(err){
          console.log(err);
          archiveDeferment.reject();
        });
      }, function(err){
        console.log(err);
        archiveDeferment.reject();
      });
      archivalProcesses.push(archiveDeferment.promise);
    });

    // queue up the next run
    if(archivalProcesses.length > 0){
      promise.all(archivalProcesses).then(function(){
        console.log("Archival complete");
        setTimeout(exports.expirationCheck, config.expirationInterval);
      }, function(){
        console.log("An archival process encountered an error");
        setTimeout(exports.expirationCheck, config.expirationInterval);
      });
    } else {
      setTimeout(exports.expirationCheck, config.expirationInterval);
    }
  });
};


//start up the engine, it'll keep itself going with setTimeout
exports.start = function(){
  stories.ready.then(function(){
    exports.expirationCheck();
    console.log("Archival engine online");
  });
};
