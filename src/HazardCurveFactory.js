'use strict';

var extend = require('extend'),
    pgp = require('pg-promise')();


var _DEFAULTS = {
  database: 'database',
  hostname: 'localhost',
  mountPath: '/ws/hazard',
  password: 'password',
  port: 5432,
  user: 'user'
};


/**
 * Factory for hazard curve information.
 *
 * @param options {Object}
 * @param options.database {String}
 *     The database to connect to
 * @param options.mountPath {String}
 *     default '/ws/hazard'.
 *     site-root relative path to web service.
 * @param options.password {String}
 *     database connection password.
 * @param options.user {String}
 *     database connection user.
 */
var HazardCurveFactory = function (options) {
  var _this,
      _initialize,

      _database,
      _edition,
      _hostname,
      _iml,
      _latitude,
      _longitude,
      _maxLatitude,
      _maxLongitude,
      _minLatitude,
      _minLongitude,
      _mountPath,
      _password,
      _port,
      _region,
      _user,
      _vs30;


  _this = {};

  _initialize = function (options) {
    options = extend({}, _DEFAULTS, options);

    _database = options.database;
    _hostname = options.hostname;
    _mountPath = options.mountPath;
    _password = options.password;
    _port = options.port;
    _user = options.user;


    _edition = options.edition;
    _latitude = options.latitude;
    _longitude = options.longitude;
    _region = options.region;
    _vs30 = options.vs30;
  };

  _this.adjustToGridSpacing = function (gridspacing) {
    _maxLatitude = _latitude + gridspacing;
    _minLatitude = _latitude - gridspacing;
    _maxLongitude = _longitude + gridspacing;
    _minLongitude = _longitude - gridspacing;
  };

  /**
   * Free references.
   */
  _this.destroy = function () {
    _database = null;
    _edition = null;
    _iml = null;
    _hostname = null;
    _latitude = null;
    _longitude = null;
    _maxLatitude = null;
    _maxLongitude = null;
    _minLatitude = null;
    _minLongitude = null;
    _mountPath = null;
    _password = null;
    _port = null;
    _user = null;
    _vs30 = null;

    _initialize = null;
    _this = null;
  };

  /**
   * Obtain database connection.
   *
   * @return {Promise}
   *     promise representing connection attempt:
   *     resolves with connection object when successful,
   *     rejects with error when unsuccessful.
   */
  _this.getConnection = function () {
    if (pgp === null) {
      return Promise.reject(new Error('pg-promise not installed'));
    } else {
      return pgp({
        database: _database,
        host: _hostname,
        port: _port,
        user: _user,
        password: _password,
      });
    }
  };

  /**
   * Obtain information.
   *
   * @return {Promise}
   *     promise representing event information:
   *     resolves with Event object when successfully retrieved,
   *     rejects with Error when unsuccessful.
   */
  _this.getCurves = function (connection, datasetid, gridspacing) {
    var sql;

    sql =
      'SELECT ' +
        'id, ' +
        'datasetid, ' +
        'latitude, ' +
        'longitude, ' +
        'afe ' +
      'FROM ' +
        'curve ' +
      'WHERE ' +
        'datasetid = $1 AND ' +
        'latitude  <= $2 AND ' +
        'latitude  >= $3 AND ' +
        'longitude <= $4 AND ' +
        'longitude >= $5';

    return connection.query({
          'text': sql,
          'values': [
            datasetid,
            _maxLatitude,
            _minLatitude,
            _maxLongitude,
            _minLongitude
          ]
        }).then(function (result) {
          var json;

          if (result.rows.length === 0) {
            throw new Error('Curves not found');
          }

          json = result.rows.forEach(function (row) {
            _this._parseRow(row);
          });

          return json;
        });
  };

  _this.getDatasets = function () {
    var results;

    results = _this.getConnection().then(function (connection) {

      var sql;

      sql =
          'SELECT ' +
              'dataset.id ' +
              'region.gridspacing ' +
          'FROM ' +
              'dataset ' +
              'INNER JOIN edition ON (dataset.editionid = edition.id) ' +
              'INNER JOIN region ON (dataset.regionid = region.id) ' +
              'INNER JOIN vs30 ON (dataset.vs30id = vs30.id) ' +
          'WHERE ' +
              'edition.value = $1 AND ' +
              'region.value  = $2 AND ' +
              'vs30.value    = $3';

      return connection.query({
            'text': sql,
            'values': [
              _edition,
              _region,
              _vs30
            ]
          }).then(function (result) {
            var datasetid,
                gridspacing;

            for (var i = 0, len = result.rows.length; i < len; i ++) {
              datasetid = result.rows[i].id;
              gridspacing = result.rows[i].gridspacing;
              _this.adjustToGridSpacing(gridspacing);

              // x-values
              _iml = result.rows[i].iml;

              return _this.getCurves(connection, datasetid);
            }

          });
    });
  };

  _this.getMetadata = function (results) {
    var params,
        url;

    params = [];

    if (_edition) {
      params.push('edition=' + _edition);
    }
    if (_latitude) {
      params.push('latitude=' + _latitude);
    }
    if (_longitude) {
      params.push('longitude=' + _longitude);
    }
    if (_region) {
      params.push('region=' + _region);
    }
    if (_vs30) {
      params.push('vs30=' + _vs30);
    }

    if (params.length > 0) {
      url = '?' + params.join('&');
    }

    return {
      'status': (results ? 'success' : 'error'),
      'date': new Date().getTime(),
      'url': url
    };
  };

  _this.getRegion = function () {
    // if no region is passed return Conterminous US
    if (!_region) {
      _region = 'COUS0P05';
    }
  };

  _this.getResults = function (params) {
    var results;

    if (params) {
      if (params.hasOwnProperty('edition')) {
        _edition = params.edition;
      }
      if (params.hasOwnProperty('latitude')) {
        _latitude = params.latitude;
      }
      if (params.hasOwnProperty('longitude')) {
        _longitude = params.longitude;
      }
      if (params.hasOwnProperty('region')) {
        _region = params.region;
      }
      if (params.hasOwnProperty('vs30')) {
        _vs30 = params.vs30;
      }
    }

    // sets to Conterminous US if none is passed in
    _this.getRegion();

    // get curve data
    results = _this.getDatasets();

    // produce json output
    return JSON.stringify({
      'metadata': _this.getMetadata(results),
      'data': results
    });
  };



  /**
   * Parse one curve row into an object.
   *
   * @param row {Object}
   *     object from getCurves query result.
   * @return {Object}
   *     curve object.
   * @see _this.getCurves
   */
  _this._parseRows = function (row) {
    var points,
        result;

    points = [];
    for (var i = 0, len = _iml.length; i < len; i++) {
      points.push({
        'x': _iml[i],
        'y': row[i] || null
      });
    }

    result = {
      'data': points
    };

    return result;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = HazardCurveFactory;
