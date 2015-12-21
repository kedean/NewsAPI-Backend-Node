var sinon = require("sinon");
var config = require("../config");
var should = require("should");
var util = require("../util");
var stories = require("../routes/stories");
var publish = require("../publication-engine");
var promise = require("promised-io/promise");

describe("Publication Engine", function(){
  describe("#handleMessage", function(){
    var addStoryWrapper, deleteStoryWrapper;
    var testId = "a";
    var story = {id:testId,details:{metadata:{}}};

    before(function(done){
      sinon.stub(stories, "findById").withArgs("PENDING", testId).returns({'then':function(c){c(story);}});
      addStoryWrapper = sinon.stub(stories, "addStory");
      deleteStoryWrapper = sinon.stub(stories, "deleteStory");
      done();
    });

    after(function(done){
      stories.findById.restore();
      stories.addStory.restore();
      stories.deleteStory.restore();
      done();
    })

    it("Moves the story and assign times", function(done){
      publish.handleMessage({data:testId});

      story.details.metadata.should.have.property("publishTime");
      story.details.metadata.should.have.property("expirationTime");

      addStoryWrapper.getCall(0).calledWith('PUBLISHED').should.be.exactly(true);
      addStoryWrapper.calledOnce.should.be.exactly(true);
      deleteStoryWrapper.getCall(0).calledWith('PENDING').should.be.exactly(true);
      deleteStoryWrapper.calledOnce.should.be.exactly(true);
      done();
    });
  });

  describe("#start", function(){
    var subStub;

    before(function(done){
      sinon.stub(promise, 'all').withArgs(stories.ready, 'ready').callsArg(0);
      sinon.stub(util, 'prepMQ').returns('ready');
      subStub = sinon.stub(util, 'mqSubscription').returns();
      done();
    });

    after(function(done){
      promise.all.restore();
      util.prepMQ.restore();
      util.mqSubscription.restore();
      done();
    });

    it("Subscribes to a queue", function(done){
      publish.start();
      subStub.getCall(0).calledWith('story_needs_publication').should.be.exactly(true);
      done();
    });
  });
});
