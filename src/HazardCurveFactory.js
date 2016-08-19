'use strict';

var extend = require('extend'),
    pgp = require('pg-promise')();


var _DEFAULTS = {
  database: 'database',
  hostname: 'localhost',
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
      _hostname,
      _password,
      _port,
      _user;


  _this = {};

  _initialize = function (options) {
    options = extend({}, _DEFAULTS, options);

    _database = options.database;
    _hostname = options.hostname;
    _password = options.password;
    _port = options.port;
    _user = options.user;
  };

  /**
   * Free references.
   */
  _this.destroy = function () {
    _database = null;
    _hostname = null;
    _password = null;
    _port = null;
    _user = null;

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
   * Obtain curve information.
   *
   * @return {Promise}
   *     promise representing curve information:
   *     resolves with an object containing curve information when
   *     successfully retrieved, rejects with Error when unsuccessful.
   */
  _this.getCurves = function (datasetid, latitude, longitude, gridspacing) {

    // all fields are required
    if (!datasetid && !latitude && !longitude && !gridspacing) {
      return Promise.reject(new Error('The following fields are required: ' +
          'datasetid, latitude, longitude, gridspacing'));
    }

    _this.getConnection().then(function (connection) {
      var maxLatitude,
          maxLongitude,
          minLatitude,
          minLongitude;

      // find min/max latitude based on grid spacing
      maxLatitude = latitude + gridspacing;
      minLatitude = latitude - gridspacing;
      maxLongitude = longitude + gridspacing;
      minLongitude = longitude - gridspacing;

      return connection.query(`
        SELECT
          id,
          datasetid,
          latitude,
          longitude,
          afe
        FROM
          curve
        WHERE
          datasetid = '${datasetid}' AND
          latitude  <= '${maxLatitude}' AND
          latitude  >= '${minLatitude}' AND
          longitude <= '${maxLongitude}' AND
          longitude >= '${minLongitude}';
      `);
    });
  };

  /**
   * Obtain dataset information.
   *
   * @return {Promise}
   *     promise representing dataset information:
   *     resolves with an object containing dataset information when
   *     successfully retrieved, rejects with Error when unsuccessful.
   */
  _this.getDataset = function (editionid, regionid, vs30id, imtid) {

    // all fields are required
    if (!editionid && !regionid && !vs30id && !imtid) {
      return Promise.reject(new Error('The following fields are required: ' +
          'editionid, regionid, vs30id, imtid'));
    }

    _this.getConnection().then(function (connection) {

      return connection.query(`
          SELECT
              id,
              imtid,
              vs30id,
              editionid,
              regionid,
              iml
          FROM
              dataset
          WHERE
              (dataset.editionid = '${editionid}' OR '${editionid}' IS NULL) AND
              (dataset.regionid = '${regionid}' OR '${regionid}' IS NULL) AND
              (dataset.vs30id = '${vs30id}' OR '${vs30id}' IS NULL) AND
              (dataset.imtid = '${imtid}' OR '${imtid}' IS NULL)
      `);
    });
  };


  /**
   * Obtain edition information.
   *
   * @return {Promise}
   *     promise representing edition information:
   *     resolves with an object containing edition information when
   *     successfully retrieved, rejects with Error when unsuccessful.
   */
  _this.getEdition = function (value) {

    // all fields are required
    if (!value) {
      return Promise.reject(new Error('The following fields are required: ' +
          'edition value'));
    }

    _this.getConnection().then(function (connection) {

      return connection.query(`
          SELECT
              id,
              value,
              display,
              displayorder
          FROM
              dataset
          WHERE
              (dataset.editionid = '${value}' OR '${value}' IS NULL) AND
      `);
    });
  };


  /**
   * Obtain imt information.
   *
   * @return {Promise}
   *     promise representing imt information:
   *     resolves with an object containing imt information when
   *     successfully retrieved, rejects with Error when unsuccessful.
   */
  _this.getImt = function (value) {

    // all fields are required
    if (!value) {
      return Promise.reject(new Error('The following fields are required: ' +
          'imt value'));
    }

    _this.getConnection().then(function (connection) {

      return connection.query(`
          SELECT
              id,
              value,
              display,
              displayorder
          FROM
              dataset
          WHERE
              (dataset.editionid = '${value}' OR '${value}' IS NULL) AND
      `);
    });
  };

  /**
   * Obtain region information.
   *
   * @return {Promise}
   *     promise representing region information:
   *     resolves with an object containing region information when
   *     successfully retrieved, rejects with Error when unsuccessful.
   */
  _this.getRegion = function (value) {

    // all fields are required
    if (!value) {
      return Promise.reject(new Error('The following fields are required: ' +
          'region value'));
    }

    _this.getConnection().then(function (connection) {

      return connection.query(`
          SELECT
              id,
              value,
              display,
              displayorder,
              minlatitude,
              maxlatitude,
              minlongitude,
              maxlongitude,
              gridspacing
          FROM
              dataset
          WHERE
              (dataset.editionid = '${value}' OR '${value}' IS NULL) AND
      `);
    });
  };

  /**
   * Obtain vs30 information.
   *
   * @return {Promise}
   *     promise representing vs30 information:
   *     resolves with an object containing vs30 information when
   *     successfully retrieved, rejects with Error when unsuccessful.
   */
  _this.getVs30 = function (value) {

    // all fields are required
    if (!value) {
      return Promise.reject(new Error('The following fields are required: ' +
          'vs30 value'));
    }

    _this.getConnection().then(function (connection) {

      return connection.query(`
          SELECT
              id,
              value,
              display,
              displayorder
          FROM
              dataset
          WHERE
              (dataset.editionid = '${value}' OR '${value}' IS NULL) AND
      `);
    });
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = HazardCurveFactory;
