'use strict';


var HazardCurveHandler = function (options) {
  var _this,
      _initialize;


  _this = {};

  _initialize = function (/*options*/) {
    _this.db = options.db;
  };

  /**
   * @param query {Object}
   *     Query string parameters received with the user request for data.
   * @return {Promise}
   *     A promise that will resolve with a hazard curve result object, or
   *     reject if an error occurs.
   */
  _this.get = function (query) {
    return new Promise((resolve, reject) => {
      var err,
          queryChain,
          queries,
          result;

      result = [];
      queries = _this.parseQuery(query);

      if (queries.length === 0) {
        err = new Error('Invalid usage'); // TODO :: Be more informative
        err.status = 400; // HTTP 400 >> Bad Usage
        reject(err);
        return;
      }

      queryChain = Promise.resolve();

      queries.forEach((/*q*/) => {
        // TODO :: Ask factory for a curve
        queryChain = queryChain.then(() => {
          return _this.db.query('SELECT * FROM curve LIMIT 1').then((data) => {
            result.push(data[0]);
          });
        });
      });

      queryChain.then(() => {
        resolve(result);
      });
    });
  };

  _this.parseQuery = function (query) {
    var queries;

    queries = [];

    // TODO :: Currently require all parameters, update to accept some things
    //         as optional
    if (query.latitude && query.longitude && query.modelEdition &&
        query.vs30 && query.modelRegion && query.spectralPeriod) {

      // TODO :: Add a query to queries for each variation that may exist
      //         caused by a user not providing an optional parameter.
      queries.push(query);
    }

    return queries;
  };

  _initialize(options);
  options = null;
  return _this;
};


module.exports = HazardCurveHandler;
