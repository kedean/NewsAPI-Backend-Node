var util = require("../util/util"),
    config = require("../util/config"),
    all = require("promised-io/promise").all,
    stories = require("../routes/stories.js");

exports.handleMessage = function(msg){
  var id = msg.data.toString();
  stories.findById(stories.Status.Pending, id).then(function(story){
    util.setNestedField(story, ['details', 'metadata', 'publishTime'], (new Date()).getTime());
    util.setNestedField(story, ['details', 'metadata', 'expirationTime'], (new Date()).getTime() + config.storyLifetime);

    stories.addStory(stories.Status.Published, story.details, id);
    stories.deleteStory(stories.Status.Pending, id);

    console.log("Published story with id " + id);
  });
};

exports.start = function(){
  all(stories.prepDB(), util.prepMQ()).then(function(){
    util.mqSubscription('story_needs_publication', exports.handleMessage);
    console.log("Publication engine online");
  });
};
