#!/usr/bin/env node

var express = require('express'),
    routes = require('./routes/routes'),
    stories = require('./routes/stories'),
    preview = require('./routes/previews'),
    cors = require('cors'),
    Promise = require('bluebird'),
    util = require('./util/util'),
    logger = require('morgan'),
    bodyParser = require('body-parser');

var app = express();

app.use(logger());
app.use(bodyParser.json());
app.use(cors());

app
  .get('/news', function(req, res){
    res.send(routes.root(req));
  })
  .get('/news/stories', function(req, res){
    res.send(routes.stories(req));
  })
  .get('/news/stories/:listingType', function(req, res){
    var status = stories.Status.fromString(req.params.listingType);
    stories.findAll(status).then(function(items){
      res.send(routes.buildListing(req, status, items));
    }, function(error){
      res.status(500);
      res.send(error);
    });
  })
  .get('/news/stories/pending/:id', function(req, res){
    stories.findById([stories.Status.Pending, stories.Status.Published, stories.Status.Rejected], req.params.id).then(function(item){
      if(item.status == stories.Status.Pending){
        res.status(202);
        res.send(routes.buildStory(req, item));
      } else if(item.status == stories.Status.Published){
        res.redirect(301, util.buildUrl(req, '/news/stories/published/' + item.id));
      } else if(item.status == stories.Status.Rejected){
        res.redirect(301, util.buildUrl(req, '/news/stories/rejected/' + item.id));
      } else {
        //what happened?
        res.status(500);
        res.send({'error':'An unknown error occurred'});
      }
    }, function(error){
      res.status(404);
      res.send(error);
    });
  })
  .get('/news/stories/published/:id', function(req, res){
    stories.findById(stories.Status.Published, req.params.id).then(function(item){
      res.status(200);
      res.send(routes.buildStory(req, item));
    }, function(error){
      res.status(404);
      res.send(error);
    });
  })
  .get('/news/stories/rejected/:id', function(req, res){
    stories.findById(stories.Status.Rejected, req.params.id).then(function(item){
      res.status(422);
      res.send(routes.buildStory(req, item));
    }, function(error){
      res.status(404);
      res.send(error);
    });
  })
  .post('/news/stories/pending', function(req, res){
    stories.addStory('pending', req.body).then(function(status){
      util.mqPublish("story_needs_validation", status.id);

      res.status(201);
      res.location(status.id);
      res.send(status);
    });
  })
  .get('/news/previews/:id.png', function(req, res){
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
