/* global afterEach, beforeEach, describe, it */
'use strict';


var expect = require('chai').expect,
    HazardCurveFactory = require('../../src/HazardCurveFactory'),
    sinon = require('sinon');

var EPSILON = 1E-20;


describe('HazardCurveFactoryTest', () => {
  var db,
      iml,
      hazardCurveFactory;

  beforeEach(function  () {
    iml = [{iml: 'iml'}];
    db = {
      query: () => { 
        return Promise.resolve(iml);
      }
    };
    hazardCurveFactory = HazardCurveFactory({
      connection: db
    });
  });

  afterEach(() => {
    iml = null;
    db = null;
    hazardCurveFactory.destroy();
  });


  describe('constructor', () => {
    it('is defined', () => {
      expect(typeof HazardCurveFactory).to.equal('function');
    });

    it('can be instantiated with a database connection', () => {
      expect(() => HazardCurveFactory({connection: db})).to.not.throw(Error);
    });

    it('cannot be instantiated without a database connection', () => {
      expect(HazardCurveFactory).to.throw(Error);
    });

    it('can be destroyed', () => {
      var factory;

      factory = HazardCurveFactory({
        connection: db
      });

      expect(factory.destroy).to.not.throw(Error);
    });
  });


  describe('interpolate', () => {
    it('can interpolate', () => {
      var result;

      result = hazardCurveFactory.interpolate(0, 0, 1, 1, 0.5);
      expect(result).to.be.closeTo(0.5, EPSILON);
    });

    it('can interpolate a curve', () => {
      var actual,
          expected,
          x,
          x0,
          x1,
          y0,
          y1;

      x = 0.5;
      x0 = 0;
      x1 = 1;
      y0 = [0, 0, 0, 0];
      y1 = [1, 1, 1, 1];

      actual = hazardCurveFactory.interpolateCurve(x0, y0, x1, y1, x);
      expected = [0.5, 0.5, 0.5, 0.5];

      expect(actual.length).to.equal(4);
      expect(actual).to.deep.equal(expected);
    });

    it('can spatially interpolate', () => {
      var data,
          latitude,
          longitude,
          value;

      latitude = 1;
      longitude = 1;
      data = [
        {
          latitude: 0,
          longitude: 0,
          afe: [1,2,3,4,5]
        },
        {
          latitude: 0,
          longitude: 2,
          afe: [1,2,3,4,5]
        },
        {
          latitude: 2,
          longitude: 0,
          afe: [1,2,3,4,5]
        },
        {
          latitude: 2,
          longitude: 2,
          afe: [1,2,3,4,5]
        }
      ];
      value = [];
      value = hazardCurveFactory.spatiallyInterpolate(latitude, longitude,
          data);

      expect(value.length).to.equal(5);
    });
  });


  describe('formatCurve', () => {
    it('formats the curve output' , () => {
      var result;

      result = hazardCurveFactory.formatCurve([1,2,3], [1,2,3]);

      expect(result).to.deep.equal([[1,1],[2,2],[3,3]]);
    });
  });


  describe('getDataset', () => {
    it('throws an error if required fields are ommited', (done) => {
      var result;

      result = hazardCurveFactory.getDataset();
      result.then(function (data) {
        done(data);
      }).catch(function () {
        done();
      });
    });

    it('queries the database', (done) => {
      var result,
          spy;

      spy = sinon.spy(db, 'query');
      result = hazardCurveFactory.getDataset(1,2,3,4);

      expect(spy.calledOnce).to.be.true;

      result.then(function (data) {
        expect(data).to.equal(iml);
        done();
      }).catch(function (err) {
        done(err);
      });
    });
  });

  describe('getCurve', () => {
    it('throws an error if required fields are ommited', function (done) {
      var result;

      result = hazardCurveFactory.getCurve();
      result.then(function (data) {
        done(data);
      }).catch(function () {
        done();
      });
    });

    it('queries the database', function (done) {
      var result,
          stubGetRegionByValue,
          stubFormatCurve,
          spyQuery;

      // create stubs/spies
      stubGetRegionByValue = sinon.stub(hazardCurveFactory, 'getRegionByValue',
          () => {
            var promise = Promise.resolve([{'gridspacing': 0.05}]);
            return promise;
          });

      stubFormatCurve = sinon.stub(hazardCurveFactory, 'formatCurve',
          () => {
            return 'data';
          });

      // Do i need this?
      sinon.stub(hazardCurveFactory, 'spatiallyInterpolate', () => {
        return null;
      });

      spyQuery = sinon.spy(db, 'query');

      // call method
      result = hazardCurveFactory.getCurve(1,2,3,4,5,6);

      result.then(function () {
        expect(stubGetRegionByValue.calledOnce).to.be.true;
        expect(stubGetRegionByValue.calledWith(4)).to.be.true;
        expect(stubFormatCurve.calledOnce).to.be.true;
        expect(stubFormatCurve.calledWith('iml')).to.be.true;
        expect(spyQuery.calledOnce).to.be.true;
        done();
      }).catch(function (err) {
        done(err);
      });

    });
  });

  describe('getEditions', () => {
    it('queries the database', (done) => {
      var result,
          spy;

      spy = sinon.spy(db, 'query');
      result = hazardCurveFactory.getEditions();

      expect(spy.calledOnce).to.be.true;

      result.then(function (data) {
        expect(data).to.equal(iml);
        done();
      }).catch(function (err) {
        done(err);
      });
    });
  });


  describe('getSpectralPeriods', () => {
    it('queries the database', (done) => {
      var result,
          spy;

      spy = sinon.spy(db, 'query');
      result = hazardCurveFactory.getSpectralPeriods();

      expect(spy.calledOnce).to.be.true;

      result.then(function (data) {
        expect(data).to.equal(iml);
        done();
      }).catch(function (err) {
        done(err);
      });
    });
  });

  describe('getRegionByValue', () => {
    it('throws an error if required fields are ommited', (done) => {
      var result;

      result = hazardCurveFactory.getRegionByValue();
      result.then(function (data) {
        done(data);
      }).catch(function () {
        done();
      });
    });

    it('queries the database', (done) => {
      var result,
          spy;

      spy = sinon.spy(db, 'query');
      result = hazardCurveFactory.getRegionByValue(1);

      expect(spy.calledOnce).to.be.true;

      result.then(function (data) {
        expect(data).to.equal(iml);
        done();
      }).catch(function (err) {
        done(err);
      });
    });
  });

  describe('getRegions', () => {
    it('queries the database', (done) => {
      var result,
          spy;

      spy = sinon.spy(db, 'query');
      result = hazardCurveFactory.getRegions();

      expect(spy.calledOnce).to.be.true;

      result.then(function (data) {
        expect(data).to.equal(iml);
        done();
      }).catch(function (err) {
        done(err);
      });
    });
  });

  describe('getVs30', () => {
    it('queries the database', (done) => {
      var result,
          spy;

      spy = sinon.spy(db, 'query');
      result = hazardCurveFactory.getVs30s(1,2,3,4);

      expect(spy.calledOnce).to.be.true;

      result.then(function (data) {
        expect(data).to.equal(iml);
        done();
      }).catch(function (err) {
        done(err);
      });
    });
  });
});
