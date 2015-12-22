var stories = require("../routes/stories.js"),
    preview = require('../routes/previews'),
    all = require("promised-io/promise").all,
    BufferBuilder = require('buffer-builder'),
    util = require("../util/util");

exports.handleMessage = function(msg){
  var id = msg.data.toString();
  stories.findById(stories.Status.Pending, id).then(function(story){
    util.setNestedField(story, ['details', 'metadata', 'previewStartTime'], (new Date()).getTime());
    console.log("Contacting url " + story.details.link);
    var stream = util.screenshot(story.details.link);
    var imageData = new BufferBuilder();

    stream.on('data', function(data){
      imageData.appendBuffer(data);
    }).on('end', function(){
      console.log("Saving preview of url " + story.details.link);
      stories.updateStory(stories.Status.Pending, story);
      preview.addPreview(story.details.link, imageData.get());
      console.log("Generated preview for id " + id + " with url " + story.details.link);
      util.mqPublish('story_needs_publication', id);
    });
  });
};

exports.start = function(){
  all(stories.prepDB(), preview.prepDB(), util.prepMQ()).then(function(){
    util.mqSubscription('story_needs_screenshot', exports.handleMessage);
    console.log("Preview engine online");
  });
};
