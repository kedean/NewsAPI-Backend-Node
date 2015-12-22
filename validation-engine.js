var stories = require("./routes/stories.js"),
    string = require("string"),
    all = require("promised-io/promise").all,
    util = require("./util");

exports.normalizeLink = function(link){
  if(!string(link).startsWith('http://') && !string(link).startsWith('https://')){
    link = 'http://' + link;
  }

  return link;
};

/**
 * Validates a story
 * If the story is found invalid, a note is supplied on its details object, and its rejectionTime is updated
 */
exports.validate = function(story){
  if(!story.details){ //prevent NPEs and allow full validation to proceed
    story.details = {};
  }
  if(!story.details.metadata){
    story.details.metadata = {};
  }

  if(!story.details.headline || story.details.headline.length == 0){
    story.details.note = "Missing headline";
    util.setNestedField(story, ['details', 'metadata', 'rejectionTime'], (new Date()).getTime());
    return false;
  } else if(!story.details.link || story.details.link.length == 0){
    story.details.note = "Missing link";
    util.setNestedField(story, ['details', 'metadata', 'rejectionTime'], (new Date()).getTime());
    return false;
  } else{
    story.details.link = exports.normalizeLink(story.details.link);
    return true;
  }
};

exports.handleMessage = function(msg){
  var id = msg.data.toString();
  stories.findById(stories.Status.Pending, id).then(function(story){
    util.setNestedField(story, ['details', 'metadata', 'validationStartTime'], (new Date()).getTime());
    if(exports.validate(story)){
      //all good! proceed in the pipeline
      stories.updateStory(stories.Status.Pending, story).then(function(){
        util.mqPublish('story_needs_screenshot', id);
        console.log("Validated story with id " + id);
      });
    } else{
      //transition it from pending to rejected
      stories.addStory(stories.Status.Rejected, story.details, id);
      stories.deleteStory(stories.Status.Pending, id);
      console.log("Rejected story with id " + id + " because of " + story.details.note.toLowerCase());
    }
  });
};

exports.start = function(){
  all(stories.prepDB(), util.prepMQ()).then(function(){
    util.mqSubscription('story_needs_validation', exports.handleMessage);
    console.log("Validation engine online");
  });
};
