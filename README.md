Node Microservice Backend
========
[![Build Status](https://travis-ci.org/kedean/NewsAPI-Backend-Node.svg)](https://travis-ci.org/kedean/NewsAPI-Backend-Node)

See the [API Spec](./api-spec.md) for more information.

This backend implementation uses a series of piped microservices communicating over messages queue to perform it's job.

```api-server.js``` is the main server that intercepts posts and gets to the API. New data is placed in MongoDB and a message is passed off to the validator.
```validation-engine.js``` verifies that a story is correctly formed, making sure it has a headline and link, and that the link is a web address. Badly formed stories are moved from pending to the rejected collection. It passes control to the previewer.
```preview-engine.js``` generates screenshots and inserts the data into the screenshot repository. When complete, it passes control to the publisher.
```publication-engine.js``` performs the final steps and moves the story into the published collection.
```archival-engine.js``` looks for expired stories and moved them to the archived collection
```requeue-engine.js``` looks for pending stories that have not been worked on in a certain amount of time. It determines what stage failed, and queues the story up for that stage. This is mostly important when messages being passed between engines are lost for some reason.

To run, use ```npm start```. You may also spin up each component on it's own.

This backend will only run with the Kerberos module for node installed (due to using Mongo DB), so using linux is recommended. RabbitMQ or an equivalent must also be installed for messaging.

Tests can be run with ```npm test``` or ```mocha```.
