var sinon = require("sinon");
var config = require("../config");
var should = require("should");
var util = require("../util");
var stories = require("../routes/stories");
var requeue = require("../requeue-engine");
var promise = require("promised-io/promise");

var ready = 'ready';

describe("Requeue Engine", function(){
  describe("#pastDelay", function(){
    config.requeueDelay = 1000;

    it("should be false against recent times", function(){
      requeue.pastDelay(new Date().getTime() - 100).should.be.exactly(false);
    });

    it("should be false against undefined times", function(){
      requeue.pastDelay(null).should.be.exactly(false);
    });

    it("should be true against distant times", function(){
      requeue.pastDelay(new Date().getTime() - 10000).should.be.exactly(true);
    });
  });

  describe("#requeueCheck", function(){
    var publishWrapper;

    before(function(done){
      var storyList = [
        {id:"a",details:{metadata:{previewStartTime:4, validationStartTime:4}}},
        {id:"b",details:{metadata:{previewStartTime:1, validationStartTime:4}}}
      ];
      sinon.stub(stories, "findAll").returns({'then':function(c){c(storyList);}});
      var pastDelayStub = sinon.stub(requeue, 'pastDelay');
      pastDelayStub.withArgs(4).returns(true);
      pastDelayStub.withArgs(1).returns(false);
      publishWrapper = sinon.stub(util, 'mqPublish');
      done();
    });

    after(function(done){
      stories.findAll.restore();
      requeue.pastDelay.restore();
      util.mqPublish.restore();
      done();
    })

    it("Publishes to the correct queues", function(done){
      requeue.requeueCheck();
      publishWrapper.getCall(0).calledWith('story_needs_screenshot', 'a').should.be.exactly(true);
      publishWrapper.getCall(1).calledWith('story_needs_validation', 'b').should.be.exactly(true);
      publishWrapper.calledTwice.should.be.exactly(true);
      done();
    });
  });

  describe("#start", function(){
    var runStub;

    before(function(done){
      sinon.stub(promise, 'all').withArgs(ready, ready).callsArg(0);
      sinon.stub(stories, 'prepDB').returns(ready);
      sinon.stub(util, 'prepMQ').returns(ready);
      runStub = sinon.stub(util, 'runPeriodically').returns();
      done();
    });

    after(function(done){
      promise.all.restore();
      stories.prepDB.restore();
      util.prepMQ.restore();
      util.runPeriodically.restore();
      done();
    });

    it("Begins the engine", function(done){
      requeue.start();
      runStub.calledOnce.should.be.exactly(true);
      runStub.getCall(0).calledWith(requeue.requeueCheck);
      done();
    });
  });
});
