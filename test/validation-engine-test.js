var sinon = require("sinon");
var config = require("../util/config");
var should = require("should");
var util = require("../util/util");
var stories = require("../routes/stories");
var validation = require("../engines/validation-engine");
var Promise = require('bluebird');

var ready = 'ready';

describe("Validation Engine", function(){
  describe("#handleMessage", function(){
    var addStoryWrapper, deleteStoryWrapper, updateStoryWrapper, pubWrapper;
    var validStory = {id:"valid",details:{headline:"test", link:"test", metadata:{}}};
    var noHeadlineStory = {id:"noHeadline",details:{link:"test",metadata:{}}};
    var noLinkStory = {id:"noLink",details:{headline:"test",metadata:{}}};

    before(function(done){
      var findStub = sinon.stub(stories, "findById");
      findStub.withArgs("PENDING", validStory.id).returns({'then':function(c){c(validStory);}});
      findStub.withArgs("PENDING", noHeadlineStory.id).returns({'then':function(c){c(noHeadlineStory);}});
      findStub.withArgs("PENDING", noLinkStory.id).returns({'then':function(c){c(noLinkStory);}});
      addStoryWrapper = sinon.stub(stories, "addStory");
      deleteStoryWrapper = sinon.stub(stories, "deleteStory");
      updateStoryWrapper = sinon.stub(stories, "updateStory");
      updateStoryWrapper.returns({'then':function(c){c();}});
      pubWrapper = sinon.stub(util, 'mqPublish');
      done();
    });

    after(function(done){
      stories.findById.restore();
      stories.addStory.restore();
      stories.deleteStory.restore();
      stories.updateStory.restore();
      util.mqPublish.restore();
      done();
    });

    it("Assigns correct times with valid story", function(done){
      validation.handleMessage({data:validStory.id});

      validStory.details.metadata.should.have.property("validationStartTime");

      updateStoryWrapper.getCall(0).calledWith('PENDING').should.be.exactly(true);
      pubWrapper.getCall(0).calledWith("story_needs_screenshot", validStory.id).should.be.exactly(true);
      pubWrapper.calledOnce.should.be.exactly(true);
      done();
    });

    it("Rejects story without a headline", function(done){
      validation.handleMessage({data:noHeadlineStory.id});

      noHeadlineStory.details.metadata.should.have.property("validationStartTime");

      addStoryWrapper.getCall(0).calledWith('REJECTED').should.be.exactly(true);
      deleteStoryWrapper.getCall(0).calledWith('PENDING', noHeadlineStory.id).should.be.exactly(true);
      done();
    });

    it("Rejects story without a link", function(done){
      validation.handleMessage({data:noLinkStory.id});

      noLinkStory.details.metadata.should.have.property("validationStartTime");

      addStoryWrapper.getCall(1).calledWith('REJECTED').should.be.exactly(true);
      deleteStoryWrapper.getCall(1).calledWith('PENDING', noLinkStory.id).should.be.exactly(true);
      done();
    });
  });

  describe("#start", function(){
    var subStub;

    before(function(done){
      sinon.stub(Promise, 'all').withArgs([ready, ready]).returns({"then":function(c){c();}});
      sinon.stub(stories, 'prepDB').returns(ready);
      sinon.stub(util, 'prepMQ').returns(ready);
      subStub = sinon.stub(util, 'mqSubscription').returns();
      done();
    });

    after(function(done){
      Promise.all.restore();
      stories.prepDB.restore();
      util.prepMQ.restore();
      util.mqSubscription.restore();
      done();
    });

    it("Subscribes to a queue", function(done){
      validation.start();
      subStub.getCall(0).calledWith('story_needs_validation').should.be.exactly(true);
      done();
    });
  });

  describe("#normalizeLink", function(){
    it("adds a protocol to a www link", function(){
      var result = validation.normalizeLink("www.test.com");
      (result == "http://www.test.com").should.be.exactly(true);
    });

    it("adds a protocol to a text link", function(){
      var result = validation.normalizeLink("test.com");
      (result == "http://test.com").should.be.exactly(true);
    });

    it("does not add a protocol to an http link", function(){
      var result = validation.normalizeLink("http://test.com");
      (result == "http://test.com").should.be.exactly(true);
    });

    it("does not add a protocol to an https link", function(){
      var result = validation.normalizeLink("https://test.com");
      (result == "https://test.com").should.be.exactly(true);
    });
  });

  describe("#validate", function(){
    it("rejects stories with no headline", function(){
      validation.validate({
        details:{
          link:"test"
        }
      }).should.be.exactly(false);
    });

    it("rejects stories with no link", function(){
      validation.validate({
        details:{
          headline:"test"
        }
      }).should.be.exactly(false);
    });

    it("rejects stories with no link or headline", function(){
      validation.validate({
        details:{
        }
      }).should.be.exactly(false);
    });

    it("accepts stories with a headline and link", function(){
      validation.validate({
        details:{
          headline:"test",
          link:"test"
        }
      }).should.be.exactly(true);
    });
  });
});
