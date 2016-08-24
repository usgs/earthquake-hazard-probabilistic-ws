'use strict';

var HazardCurveFactory = require('../HazardCurveFactory');


var HazardCurveHandler = function (options) {
  var _this,
      _initialize;


  _this = {};

  _initialize = function (options) {
    _this.factory = HazardCurveFactory({
      connection: options.db
    });
  };

  /**
   * @param query {Object}
   *     Query string parameters received with the user request for data.
   * @return {Promise}
   *     A promise that will resolve with a hazard curve result object, or
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

    // TODO :: Currently require all parameters, update to accept some things
    //         as optional

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
      err = new Error('Required parameter missing: ' + buf.join(', '));
      err.status = 400;
      return Promise.reject(err);
    }

    chain = Promise.resolve();

    if (typeof modelRegion === 'undefined' || modelRegion === null) {
      chain = chain.then(() => {
        return _this.factory.getRegions(latitude, longitude, modelEdition)
            .then((regions) => {
              modelRegion = regions[0].value;
            });
      });
    }

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
