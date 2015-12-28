#!/usr/bin/env node

var express = require('express'),
    stories = require('./routes/stories'),
    preview = require('./routes/previews'),
    cors = require('cors'),
    Promise = require('bluebird'),
    util = require('./util/util'),
    bodyParser = require('body-parser');

var app = express();

app.use(express.logger('dev'));
app.use(bodyParser.json());
app.use(cors());

app
  .get('/news/stories', function(req, res){
    stories.findAll('published').then(function(items){
      res.send(items);
    }, function(error){
      res.status(500);
      res.send(error);
    });
  })
  .get('/news/stories/:id', function(req, res){
    stories.findById([stories.Status.Published, stories.Status.Pending, stories.Status.Rejected], req.params.id).then(function(item){
      if(item.status == stories.Status.Rejected){
        res.status(404);
      }
      res.send(item);
    }, function(error){
      res.status(404);
      res.send(error);
    });
  })
  .post('/news/stories', function(req, res){
    stories.addStory('pending', req.body).then(function(status){
      util.mqPublish("story_needs_validation", status.id);

      res.status(201);
      res.location(status.id);
      res.send(status);
    });
  })
  .get('/news/previews/:id', function(req, res){
    stories.findById(stories.Status.Published, req.params.id).then(function(story){
      preview.findById(story.details.link).then(function(screenshot){
        res.set('Content-Type', 'image/png');
        res.set('Content-Length', screenshot.data.buffer.length);
        res.send(screenshot.data.buffer);
      }, function(error){
        console.trace("Can't find preview for url " + story.details.link);
        res.status(404).end();
      });
    }, function(error){
      console.trace("Can't find story with id " + req.params.id);
      res.status(404).end();
    });
  });

Promise.all([util.prepMQ(), stories.prepDB(), preview.prepDB()]).then(function(){
  app.listen(8080);
  console.log("Listening on port 8080...");
});
