'use strict';


var express = require('express'),
    extend = require('extend');


var _DEFAULTS;

_DEFAULTS = {
  MOUNT_PATH: '/',
  PORT: 8000
};


// TODO, this is just a placeholder
var WebService = function (options) {
  var _this,
      _initialize,

      _mountPath,
      _port;


  _this = {};

  _initialize = function (options) {
    options = extend(true, {}, _DEFAULTS, options);

    _mountPath = options.MOUNT_PATH;
    _port = options.PORT;
  };


  _this.destroy = function () {
    _this = null;
  };

  /**
   * Start the web service in an express server.
   *
   */
  _this.start = function () {
    var app;

    app = express();

    // handle dynamic requests
    // TODO

    // rest fall through to htdocs as static content.
    app.use(_mountPath, express.static(__dirname + '/htdocs'));

    app.listen(_port, function () {
      process.stderr.write('WebService listening ' +
          'http://localhost:' + _port + _mountPath + '/\n');
    });
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = WebService;
