'use strict';

var HazardCurveFactory = require('../HazardCurveFactory');


/**
 * Handler for hazard curve requests.
 *
 * Parses and validates input parameters. Fetches curve data using the
 * {HazardCurveFactory} and returns results.
 *
 * @param options {Object}
 *     Configuration options for this handler. See `_initialize` for details.
 */
var HazardCurveHandler = function (options) {
  var _this,
      _initialize;


  _this = {};

  /**
   * Initializes a new handler instance. Called during construction.
   *
   * @param options {Object}
   *     Configuration options for this handler instance. Specifically:
   * @param options.db {pg-promise::Database}
   *     A pg-promise database connection
   */
  _initialize = function (options) {
    _this.factory = HazardCurveFactory({
      connection: options.db
    });
  };

  /**
   * Handles GET requests for data.
   *
   * @param query {Object}
   *     Query string parameters received with the user request for data.
   *
   * @return {Promise}
   *     A promise that resolves with a hazard curve result object, or
   *     reject if an error occurs.
   */
  _this.get = function (query) {
    var results;

    results = [];
    return _this.parseQuery(query).then((queries) => {
      var result;

      result = Promise.resolve();

      queries.forEach((q) => {
        result = result.then(() => {
          return _this.factory.getCurve(q.latitude, q.longitude, q.modelEdition,
              q.modelRegion, q.spectralPeriod, q.vs30).then((curve) => {
                results.push(curve);
                return results;
              });
        });
      });

      return result;
    });
  };

  /**
   * Parses the (possibly partial) query from the original GET request into
   * an array of (complete) query objects. That is, some parameters are
   * optional in the web service API and this method fills in the defaults.
   * Some optional parameters may default to using "all available" values,
   * and hence an array of queries.
   *
   * @param query {Object}
   *     An object containing required and some or all optional parameters
   *     per the web API.
   *
   * @return {Promise<Array, Error>}
   *     A promise resolving with an array of complete query objects. Each
   *     object contains a single value for all required and optional
   *     parameters. If the original `query` does not specify all required
   *     parameters, or if an error occurs, the promise rejects with an error.
   */
  _this.parseQuery = function (query) {
    var buf,
        chain,
        err,
        latitude,
        longitude,
        modelEdition,
        modelRegion,
        queries,
        spectralPeriod,
        vs30;

    buf = [];
    queries = [];

    latitude = query.latitude;
    longitude = query.longitude;
    modelEdition = query.modelEdition;
    modelRegion = query.modelRegion;
    spectralPeriod = query.spectralPeriod;
    vs30 = query.vs30;

    // Checks for required parameters if one is missing formats error message
    if (typeof latitude === 'undefined' || latitude === null) {
      buf.push('latitude');
    }

    if (typeof longitude === 'undefined' || longitude === null) {
      buf.push('longitude');
    }

    if (typeof modelEdition === 'undefined' || modelEdition === null) {
      buf.push('modelEdition');
    }

    if (typeof vs30 === 'undefined' || vs30 === null) {
      buf.push('vs30');
    }

    if (buf.length > 0) {
      err = new Error('Missing required parameter(s): ' + buf.join(', '));
      err.status = 400;
      return Promise.reject(err);
    }

    // All required parameters are set. Now handle the optional parameters.
    chain = Promise.resolve();

    // If no modelRegion is set, use the "best available region"
    if (typeof modelRegion === 'undefined' || modelRegion === null) {
      chain = chain.then(() => {
        return _this.factory.getRegions(latitude, longitude, modelEdition)
            .then((regions) => {
              modelRegion = regions[0].value;
            });
      });
    }

    // If no spectralPeriod is set, use "all available periods"
    if (typeof spectralPeriod === 'undefined' || spectralPeriod === null) {
      chain = chain.then(() => {
        return _this.factory.getSpectralPeriods(modelEdition, modelRegion)
            .then((spectralPeriods) => {
              spectralPeriod = spectralPeriods.map((period) => {
                return period.value;
              });
            });
      });
    } else {
      spectralPeriod = [spectralPeriod];
    }

    chain = chain.then(() => {
      spectralPeriod.forEach((period) => {
        queries.push({
          latitude: latitude,
          longitude: longitude,
          modelEdition: modelEdition,
          modelRegion: modelRegion,
          spectralPeriod: period,
          vs30: vs30
        });
      });

      return queries;
    });

    return chain;
  };

  _initialize(options);
  options = null;
  return _this;
};


module.exports = HazardCurveHandler;
