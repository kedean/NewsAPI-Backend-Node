exports.mqUrl = 'amqp://guest:guest@localhost:5672';
exports.mongoHost = '10.21.0.218';
exports.mongoPort = 27017;
exports.mongoDbName = 'news-api';

exports.storyLifetimeMillis = 1 * 24 * 60 * 60 * 1000; //1 day, 24 hours, 60 minutes per hour, 60 seconds per minute, 1000 millis per second
//exports.storyLifetimeMillis = 10 * 1000;
exports.expirationInterval = 5000;
exports.requeueDelay = 10000;
exports.requeueInterval = 5000;
