var config = require("./config");
var amqp = require("amqp");
var promise = require("promised-io/promise");
var webshot = require("webshot");

// Message queuing helpers
var mq;

exports.prepMQ = function(){
  var result = new promise.Deferred();
  if(!mq){
    mq = amqp.createConnection({url:config.mqUrl}, {'defaultExchangeName':''}).on('ready', result.resolve);
  } else{
    if(mq.readyEmitted){
      result.resolve();
    } else{
      mq.on('ready', result.resolve);
    }
  }
  return result.promise;
}

exports.mqSubscription = function(queueName, callback){
  mq.queue(queueName, function(queue){
    console.log("Message queue '" + queueName + "' ready");
    queue.bind("#");
    queue.subscribe(callback);
  });
};

exports.mqPublish = function(queueName, value){
  mq.publish(queueName, value);
}

// Other

/**
 * Helper to set a nested field that may or may not exist already.
 */
exports.setNestedField = function(target, levels, value){
  if(!target){
    throw "Target cannot be empty";
  } else if(!levels || levels.length < 2){
    throw "At least two levels of the nested field must be provided";
  }

  var subObject = target;

  levels.slice(0, -1).forEach(function(level){
    subObject[level] = subObject[level] || {};
    subObject = subObject[level];
  });
  subObject[levels.slice(-1)[0]] = value;
}

/**
 * Runs a callback every interval milliseconds, and once immediately. Used to verify during unit testing
 */
exports.runPeriodically = function(callback, interval){
  var callIt = function(){
    promise.when(callback(), function(){
      setTimeout(callIt, interval);
    });
  };

  callIt();
}

/**
 * Exposes webshot in a way that lets unit tests mock it
 */
exports.screenshot = webshot;
