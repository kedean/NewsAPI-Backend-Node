var config = require("./config");
var amqp = require("amqp");
var Promise = require('bluebird');
var webshot = require("webshot");

// Message queuing helpers
var mq, mqReady;

exports.prepMQ = function(){
  if(!mqReady){
    mqReady = new Promise(function(resolve, reject){
      var tryConnect = function(){
        console.log("Attempting to connect to message broker");
        mq = amqp.createConnection({url:config.mqUrl}, {'defaultExchangeName':''})
          .on('ready', function(){
            console.log("Connected to message broker");
            resolve();
          });
      };

      tryConnect();
    });
  }

  return mqReady;
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
    var requeue = function(){
      setTimeout(callIt, interval);
    };
    callback().then(requeue, requeue);
  };

  callIt();
}

/**
 * Exposes webshot in a way that lets unit tests mock it
 */
exports.screenshot = webshot;


exports.repeatingMongoConnection = function(db){
  return new Promise(function(resolve, reject){
    var tryConnect = function(){
      db.open(function(err, db){
        console.log("Attempting to connect to MongoDB on " + config.mongoDbName);
        if(!err){
          console.log("Connected to MongoDB on " + config.mongoDbName);
          resolve();
        } else{
          console.trace(err);
          console.error("Failed to connect to MongoDB on " + config.mongoDbName + ", trying again in " + config.mongoRetryTime + " milliseconds");
          setTimeout(tryConnect, config.mongoRetryTime);
        }
      });
    };

    tryConnect();
  });
}
