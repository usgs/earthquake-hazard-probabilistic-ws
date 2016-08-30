'use strict';

var extend = require('extend'),
    fs = require('fs'),
    WebService = require('./WebService');


var config,
    configPath,
    service;


configPath = 'src/conf/config.json';

if (fs.existsSync(configPath)) {
  config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
} else {
  process.stderr.write('Application configuration not found,' +
      ' recommend running "node src/lib/pre-install"\n');

  config = {
    MOUNT_PATH: '/',
    PORT: 8000,
    DB_HOST: 'localhost',
    DB_USER: 'user',
    DB_PASS: 'pass',
    DB_PORT: 5432
  };
}

config = extend(config, process.env);


service = WebService(config);
service.start();
