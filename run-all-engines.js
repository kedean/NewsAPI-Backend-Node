#!/usr/bin/env node

require('./engines/validation-engine').start(),
require('./engines/preview-engine').start(),
require('./engines/publication-engine').start(),
require('./engines/archival-engine').start(),
require('./engines/requeue-engine').start();
