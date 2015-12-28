var sinon = require("sinon");
var config = require("../util/config");
var should = require("should");
var util = require("../util/util");
var stories = require("../routes/stories");
var archive = require("../engines/archival-engine");
var Promise = require('bluebird');

var ready = 'ready';

describe("Archival Engine", function(){

  describe("#archiveStory", function(){
    var addStoryWrapper, deleteStoryWrapper;
    var testId = 'test_id';
    var story = {'id':testId, 'details':{'headline':'test_headline'}};

    before(function(done){
      addStoryWrapper = sinon.stub(stories, 'addStory').returns({'then':function(c){c();}});
      deleteStoryWrapper = sinon.stub(stories, 'deleteStory').returns({'then':function(c){c();}});
      done();
    });

    after(function(done){
      stories.addStory.restore();
      stories.deleteStory.restore();
      done();
    })

    it("moves the story between collections", function(done){
      archive.archiveStory(story);
      addStoryWrapper.getCall(0).calledWith(stories.Status.Archived, story.details, testId).should.be.exactly(true);
      deleteStoryWrapper.getCall(0).calledWith(stories.Status.Published, testId).should.be.exactly(true);
      done();
    });
  });

  describe("#start", function(){
    var runStub;

    before(function(done){
      sinon.stub(stories, 'prepDB').returns({"then":function(c){c();}});
      runStub = sinon.stub(util, 'runPeriodically').returns();
      done();
    });

    after(function(done){
      stories.prepDB.restore();
      util.runPeriodically.restore();
      done();
    });

    it("Begins the engine", function(done){
      archive.start();
      runStub.calledOnce.should.be.exactly(true);
      runStub.getCall(0).calledWith(archive.expirationCheck);
      done();
    });
  });
});
