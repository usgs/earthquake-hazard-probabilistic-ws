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
      _latitude,
      _longitude,
      _mountPath,
      _password,
      _port,
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
    _vs30 = options.vs30;
  };


  /**
   * Free references.
   */
  _this.destroy = function () {
    _database = null;
    _edition = null;
    _hostname = null;
    _latitude = null;
    _longitude = null;
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
  _this.getCurves = function (connection, datasetid) {
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
        'latitude  = $2 AND ' +
        'longitude = $3';

    return connection.query({
          'text': sql,
          'values': [datasetid, _latitude, _longitude]
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

  _this.getDatasets = function (connection, regionid) {
    var sql;

    sql =
        'SELECT ' +
            'id ' +
        'FROM ' +
            'dataset ' +
        'WHERE ' +
            'editionid = $1 AND ' +
            'regionid  = $2 AND ' +
            'vs30id    = $3';

    return connection.query({
          'text': sql,
          'values': [_edition, regionid, _vs30]
        }).then(function (result) {
          var datasetid;

          datasetid = result.rows[0].id;

          return _this.getCurves(connection, datasetid);
        });
  };

  _this.getRegions = function () {
    var results;

    results = _this.getConnection().then(function (connection) {

      var sql;

      sql =
          'SELECT ' +
              'id ' +
          'FROM ' +
              'region ' +
          'WHERE ' +
              'maxlatitude  < $1 AND ' +
              'minlatitude  > $1 AND ' +
              'maxlongitude < $2 AND ' +
              'minlongitude > $2';

      return connection.query({
            'text': sql,
            'values': [_latitude, _longitude]
          }).then(function (result) {
            var regionid;

            regionid = result.rows[0].id;

            return _this.getDatasets(connection, regionid);
          });
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
  _this._parseRow = function (row) {
    var result;

    result = {
      'row': row
    };

    return result;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = HazardCurveFactory;
