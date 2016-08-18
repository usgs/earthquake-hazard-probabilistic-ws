'use strict';


var extend = require('extend');


var _DEFAULTS = {};


// TODO, this is just a placeholder
var WebService = function (options) {
  var _this,
      _initialize;


  _this = {};

  _initialize = function (options) {
    options = extend(true, {}, _DEFAULTS, options);
  };

  _this.destroy = function () {
    _this = null;
  };

  _initialize(options);
  options = null;
  return _this;
};


module.exports = WebService;
