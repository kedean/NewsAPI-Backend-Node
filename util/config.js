var argv = require("minimist")(process.argv.slice(2)); //command line arguments as a map

exports.mqUrl = argv.mqUrl || 'amqp://guest:guest@localhost:5672';
exports.mongoHost = argv.mongoHost || 'localhost';
exports.mongoPort = argv.mongoPort || 27017;
exports.mongoDbName = argv.mongoDbName || 'news-api';

exports.storyLifetime = argv.storyLifetime || 1 * 24 * 60 * 60 * 1000; //1 day, 24 hours, 60 minutes per hour, 60 seconds per minute, 1000 millis per second
//exports.storyLifetime = 2 * 1000;
exports.expirationInterval = argv.expirationInterval || 1000;
exports.requeueDelay = argv.requeueDelay || 10000;
exports.requeueInterval = argv.requeueInterval || 5000;
