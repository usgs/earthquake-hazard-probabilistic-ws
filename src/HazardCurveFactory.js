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
   * Obtain curve information.
   *
   * @return {Promise}
   *     promise representing curve information:
   *     resolves with an object containing curve information when
   *     successfully retrieved, rejects with Error when unsuccessful.
   */
  _this.getCurve = function (latitude, longitude, edition, region, imt, vs30) {

    // all fields are required
    if (!latitude && !longitude && !edition && !region && !imt && !vs30) {
      return Promise.reject(new Error('The following fields are required: ' +
          'latitude, longitude, edition, region, imt, vs30'));
    }

    return _this.getRegion(region).then(function (result) {
      var gridspacing,
          maxLatitude,
          maxLongitude,
          minLatitude,
          minLongitude;

      // find min/max latitude based on grid spacing
      gridspacing = result.row[0].gridspacing;
      maxLatitude = latitude + gridspacing;
      minLatitude = latitude - gridspacing;
      maxLongitude = longitude + gridspacing;
      minLongitude = longitude - gridspacing;

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
          dataset INNER JOIN (dataset.id = curve.datasetid)
          edition INNER JOIN (dataset.editionid = edition.id)
          region  INNER JOIN (dataset.regionid = region.id)
          imt     INNER JOIN (dataset.imtid = imt.id)
          vs30    INNER JOIN (dataset.vs30 = vs30.id)
        WHERE
          curve.latitude  <= '${maxLatitude}' AND
          curve.latitude  >= '${minLatitude}' AND
          curve.longitude <= '${maxLongitude}' AND
          curve.longitude >= '${minLongitude}' AND
          edition.value = '${edition}' AND
          region.value = '${region}' AND
          imt.value = '${imt}' AND
          vs30.value = '${vs30}'

      `).then(function (result) {
        return _this.spatiallyInterpolate(latitude, longitude, result.row);
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
    if (!editionid && !regionid && !vs30id && !imtid) {
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
  _this.getEdition = function (value) {

    // all fields are required
    if (!value) {
      return Promise.reject(new Error('The following fields are required: ' +
          'edition value'));
    }

    return _this.connection.query(`
        SELECT
            id,
            value,
            display,
            displayorder
        FROM
            edition
        WHERE
            value = '${value}'
        ORDER BY
            displayorder ASC
    `);
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

    return _this.connection.query(`
        SELECT
            id,
            value,
            display,
            displayorder
        FROM
            imt
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
  _this.getRegion = function (value) {

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

    return _this.connection.query(`
        SELECT
            id,
            value,
            display,
            displayorder
        FROM
            vs30
        WHERE
            value = '${value}'
    `);
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
      result = data[0].yvals;
    } else if (numYVals === 2) {
      y0 = data[0];
      y1 = data[1];

      if (y0.latitude === y1.latitude) {
        // Latitudes match, interpolate with respect to longitude
        result = _this.interpolateCurve(y0.longitude, y0.yvals,
            y1.longitude, y1.yvals, longitude);
      } else if (y0.longitude === y1.longitude) {
        // Latitudes match, interpolate with respect to latitude
        result = _this.interpolateCurve(y0.latitude, y0.yvals,
            y1.latitude, y1.yvals, latitude);
      }
    } else if (numYVals === 4) {
      y0 = data[0];
      y1 = data[1];
      y2 = data[2];
      y3 = data[3];

      // Interpolate top (first) two points with respect to longitude
      top = _this.interpolateCurve(y0.longitude, y0.yvals,
          y1.longitude, y1.yvals, longitude);

      // Interpolate bottom (second) two points with respect to longitude
      bottom = _this.interpolateCurve(y2.longitude, y2.yvals,
          y3.longitude, y3.yvals, longitude);

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
