'use strict';

var extend = require('extend');


var _DEFAULTS = {};


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
      _initialize;

  _this = {};

  _initialize = function (options) {
    options = extend({}, _DEFAULTS, options);

    _this.connection = options.connection;

    if (!_this.connection) {
      throw new Error('No database connection provided');
    }
  };

  /**
   * Free references.
   */
  _this.destroy = function () {
    _initialize = null;
    _this = null;
  };

  /**
   * Format x,y data
   *
   * @param x {array}
   *        x-values
   * @param y {[type]}
   *        y-values
   * @return {Array<array>}
   *         Multi-dimensional array of x,y values
   */
  _this.formatCurve = function (x, y) {
    var series;

    series = [];
    for (var i = 0, len = x.length; i < len; i++) {
      series.push([x[i], y[i]]);
    }

    return series;
  };

  /**
   * Obtain curve information.
   *
   * @return {Promise}
   *     promise representing curve information:
   *     resolves with an object containing curve information when
   *     successfully retrieved, rejects with Error when unsuccessful.
   */
  _this.getCurve = function (latitude, longitude, edition, region, imt, vs30) {
    // all fields are required
    if (latitude === null || longitude === null || !edition || !region ||
        !imt || !vs30) {
      return Promise.reject(new Error('The following fields are required: ' +
          'latitude, longitude, edition, region, imt, vs30'));
    }

    return _this.getRegionByValue(region).then(function (result) {
      var gridspacing,
          maxLatitude,
          maxLongitude,
          minLatitude,
          minLongitude;

      // find min/max latitude based on grid spacing
      gridspacing = parseFloat(result[0].gridspacing);
      maxLatitude = parseFloat(latitude) + gridspacing;
      minLatitude = parseFloat(latitude) - gridspacing;
      maxLongitude = parseFloat(longitude) + gridspacing;
      minLongitude = parseFloat(longitude) - gridspacing;

      return _this.connection.query(`
        SELECT
          curve.id,
          curve.datasetid,
          curve.latitude,
          curve.longitude,
          curve.afe,
          dataset.iml
        FROM
          curve
          INNER JOIN dataset ON (dataset.id = curve.datasetid)
          INNER JOIN edition ON (dataset.editionid = edition.id)
          INNER JOIN region  ON (dataset.regionid = region.id)
          INNER JOIN imt     ON (dataset.imtid = imt.id)
          INNER JOIN vs30    ON (dataset.vs30id = vs30.id)
        WHERE
          curve.latitude  < ${maxLatitude} AND
          curve.latitude  > ${minLatitude} AND
          curve.longitude < ${maxLongitude} AND
          curve.longitude > ${minLongitude} AND
          edition.value = '${edition}' AND
          region.value = '${region}' AND
          imt.value = '${imt}' AND
          vs30.value = '${vs30}'
      `).then(function (result) {
        return {
          'metadata': {
            'edition': edition,
            'imt': imt,
            'latitude': latitude,
            'longitude': longitude,
            'region': region,
            'vs30': vs30
          },
          'data': _this.formatCurve(result[0].iml,
              _this.spatiallyInterpolate(latitude, longitude, result))
        };
      });
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
    if (!editionid || !regionid || !vs30id || !imtid) {
      return Promise.reject(new Error('The following fields are required: ' +
          'editionid, regionid, vs30id, imtid'));
    }

    return _this.connection.query(`
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
  };


  /**
   * Obtain edition information.
   *
   * @return {Promise}
   *     promise representing edition information:
   *     resolves with an object containing edition information when
   *     successfully retrieved, rejects with Error when unsuccessful.
   */
  _this.getEditions = function (hasdata) {
    var sql;

    sql = 'SELECT DISTINCT ' +
            'edition.id, ' +
            'edition.value, ' +
            'edition.display, ' +
            'edition.displayorder ' +
        'FROM ' +
            'edition ' +
            (hasdata ?
                'INNER JOIN dataset ON (edition.id = dataset.editionid) ': '') +
        'ORDER BY ' +
            'edition.displayorder ASC';

    return _this.connection.query(sql);
  };

  /**
   * Obtain imt information.
   *
   * @return {Promise}
   *     promise representing imt information:
   *     resolves with an object containing imt information when
   *     successfully retrieved, rejects with Error when unsuccessful.
   */
  _this.getSpectralPeriods = function (hasdata) {
    var sql;

    sql = 'SELECT DISTINCT ' +
            'imt.id, ' +
            'imt.value, ' +
            'imt.display, ' +
            'imt.displayorder ' +
        'FROM ' +
            'imt ' +
            (hasdata ?
                'INNER JOIN dataset ON (imt.id = dataset.imtid) ': '') +
        'ORDER BY ' +
            'imt.displayorder ASC';

    return _this.connection.query(sql);
  };

  /**
   * Obtain region details based on value provided
   *
   * @return {Promise}
   *     promise representing region information:
   *     resolves with an object containing region information when
   *     successfully retrieved, rejects with Error when unsuccessful.
   */
  _this.getRegionByValue = function (value) {

    // all fields are required
    if (!value) {
      return Promise.reject(new Error('The following fields are required: ' +
          'region value'));
    }

    return _this.connection.query(`
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
            region
        WHERE
            value = '${value}'
    `);
  };

  /**
   * Obtain region information.
   *
   * @return {Promise}
   *     promise representing region information:
   *     resolves with an object containing region information when
   *     successfully retrieved, rejects with Error when unsuccessful.
   */
  _this.getRegions = function (hasdata, latitude, longitude) {
    var sql;

    sql = 'SELECT DISTINCT ' +
            'region.id, ' +
            'region.value, ' +
            'region.display, ' +
            'region.displayorder ' +
        'FROM ' +
            'region ' +
            (hasdata ?
                'INNER JOIN dataset ON (region.id = dataset.regionid) ': '') +
        (latitude !== null && longitude !== null ?
            'WHERE' +
              'region.maxlatitude >= ' + latitude +
              'region.maxlongitude >= ' + longitude +
              'region.minlatitude <= ' + latitude +
              'region.minlongitude <= ' + longitude
            : '' ) +
        'ORDER BY ' +
            'region.displayorder ASC';

    return _this.connection.query(sql);
  };

  /**
   * Obtain vs30 information.
   *
   * @return {Promise}
   *     promise representing vs30 information:
   *     resolves with an object containing vs30 information when
   *     successfully retrieved, rejects with Error when unsuccessful.
   */
  _this.getVs30s = function (hasdata) {
    var sql;

    sql = 'SELECT DISTINCT ' +
            'vs30.id, ' +
            'vs30.value, ' +
            'vs30.display, ' +
            'vs30.displayorder ' +
        'FROM ' +
            'vs30 ' +
            (hasdata ?
                'INNER JOIN dataset ON (vs30.id = dataset.vs30id) ': '') +
        'ORDER BY ' +
            'vs30.displayorder ASC';

    return _this.connection.query(sql);
  };

  _this.interpolate = function (x0, y0, x1, y1, x) {
    return y0 + ((x - x0) * ((y1 - y0) / (x1 - x0)));
  };

  _this.interpolateCurve = function (x0, y0, x1, y1, x) {
    var i,
        len,
        y;

    y = [];
    len = Math.min(y0.length, y1.length);

    for (i = 0; i < len; i++) {
      y.push(_this.interpolate(x0, y0[i], x1, y1[i], x));
    }

    return y;
  };

  /**
   * Spatially interpolate curve data.
   *
   * @param latitude {number}
   *        latitude point value
   * @param longitude {number}
   *        longitude point value
   * @param data {array}
   *        curve y-values, from getCurve()
   * @return {array}
   *        interpolated y-values
   */
  _this.spatiallyInterpolate = function (latitude, longitude, data) {
    var bottom,
        numYVals,
        result,
        top,
        y0,
        y1,
        y2,
        y3;

    result = [];
    numYVals = data.length;

    if (numYVals === 1) {
      result = data[0].afe;
    } else if (numYVals === 2) {
      y0 = data[0];
      y1 = data[1];

      if (y0.latitude === y1.latitude) {
        // Latitudes match, interpolate with respect to longitude
        result = _this.interpolateCurve(y0.longitude, y0.afe,
            y1.longitude, y1.afe, longitude);
      } else if (y0.longitude === y1.longitude) {
        // Latitudes match, interpolate with respect to latitude
        result = _this.interpolateCurve(y0.latitude, y0.afe,
            y1.latitude, y1.afe, latitude);
      }
    } else if (numYVals === 4) {
      y0 = data[0];
      y1 = data[1];
      y2 = data[2];
      y3 = data[3];

      // Interpolate top (first) two points with respect to longitude
      top = _this.interpolateCurve(y0.longitude, y0.afe,
          y1.longitude, y1.afe, longitude);

      // Interpolate bottom (second) two points with respect to longitude
      bottom = _this.interpolateCurve(y2.longitude, y2.afe,
          y3.longitude, y3.afe, longitude);

      // Interpolate top/bottom (interpolated) results with respect to latitude
      result = _this.interpolateCurve(y0.latitude, top,
          y2.latitude, bottom, latitude);
    }

    return result;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = HazardCurveFactory;

