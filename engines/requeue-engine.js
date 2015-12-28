var stories = require("../routes/stories.js"),
    string = require("string"),
    config = require("../util/config"),
    Promise = require('bluebird'),
    util = require("../util/util");

exports.pastDelay = function(baseTime){
  return (typeof baseTime == 'number') && ((new Date()).getTime() - baseTime) > config.requeueDelay;
}

exports.requeueCheck = function(){
  return stories.findAll(stories.Status.Pending).then(function(pending){
    var now = new Date().getTime();
    pending.forEach(function(story){
      var metadata = story.details.metadata;

      if(exports.pastDelay(metadata.previewStartTime)){ // the issue occurred while generating a preview
        console.log("Requeueing story with id " + story.id + " for preview");
        util.mqPublish('story_needs_screenshot', story.id);
      } else { // issue happened while validating or we don't know what happened
        console.log("Requeueing story with id " + story.id + " for validation");
        util.mqPublish('story_needs_validation', story.id);
      }
    });
  });
};

exports.start = function(){
  Promise.all([stories.prepDB(), util.prepMQ()]).then(function(){
    util.runPeriodically(exports.requeueCheck, config.requeueInterval);
    console.log("Requeue engine online");
  });
};
