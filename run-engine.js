#!/usr/bin/env node

require("./engines/" + process.argv[2] + "-engine.js").start();
