var sinon = require("sinon");
var config = require("../util/config");
var should = require("should");
var util = require("../util/util");
var stories = require("../routes/stories");
var previews = require("../routes/previews");
var screenshot = require("../engines/preview-engine");
var Promise = require('bluebird');

var ready = 'ready';

describe("Preview Engine", function(){
  describe("#handleMessage", function(){
    var addPreviewWrapper, updateStoryWrapper, pubWrapper;
    var testLink = "test";
    var story = {id:"id",details:{link:testLink, metadata:{}}};
    var imageData = "testing";

    before(function(done){
      var findStub = sinon.stub(stories, "findById");
      findStub.withArgs("PENDING", story.id).returns({'then':function(c){c(story);}});
      addPreviewWrapper = sinon.stub(previews, "addPreview");
      updateStoryWrapper = sinon.stub(stories, "updateStory");
      pubWrapper = sinon.stub(util, 'mqPublish');

      var dataStub = {'on':function(event,callback){
        if(event == 'data'){
          callback(new Buffer(imageData));
          return this;
        } else if(event == 'end'){
          callback();
          return this;
        }
      }};
      sinon.stub(util, 'screenshot').returns(dataStub);

      done();
    });

    after(function(done){
      stories.findById.restore();
      previews.addPreview.restore();
      stories.updateStory.restore();
      util.mqPublish.restore();
      done();
    });

    it("Generates a screenshot and assigns a start time", function(done){
      screenshot.handleMessage({data:story.id});

      story.details.metadata.should.have.property("previewStartTime");

      updateStoryWrapper.getCall(0).calledWith('PENDING').should.be.exactly(true);
      addPreviewWrapper.getCall(0).calledWith(testLink, imageData);
      pubWrapper.getCall(0).calledWith("story_needs_publication", story.id).should.be.exactly(true);
      pubWrapper.calledOnce.should.be.exactly(true);
      done();
    });
  });

  describe("#start", function(){
    var subStub;

    before(function(done){
      sinon.stub(Promise, 'all').withArgs([ready, ready, ready]).returns({"then":function(c){c();}});
      sinon.stub(util, 'prepMQ').returns(ready);
      sinon.stub(stories, 'prepDB').returns(ready);
      sinon.stub(previews, 'prepDB').returns(ready);
      subStub = sinon.stub(util, 'mqSubscription').returns();
      done();
    });

    after(function(done){
      Promise.all.restore();
      stories.prepDB.restore();
      previews.prepDB.restore();
      util.prepMQ.restore();
      util.mqSubscription.restore();
      done();
    });

    it("Subscribes to a queue", function(done){
      screenshot.start();
      subStub.getCall(0).calledWith('story_needs_screenshot').should.be.exactly(true);
      done();
    });
  });
});
