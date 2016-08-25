/* global afterEach, beforeEach, describe, it */
'use strict';


var expect = require('chai').expect,
    HazardCurveHandler = require('../../src/handler/HazardCurveHandler'),
    sinon = require('sinon');


// Stub up some results
var _CURVE,
    _FACTORY,
    _REGIONS,
    _SPECTRAL_PERIODS;


_CURVE = {
  metadata: {
    edition: 'Test Edition',
    imt: 'Test Imt',
    latitude: 0.0,
    longitude: 0.0,
    region: 'Test Region',
    vs30: 'Test Vs30'
  },
  data: [
    [0.1, 2.3025], [0.2, 1.6094], [0.3, 1.2039],
    [0.4, 0.9162], [0.5, 0.6931], [0.6, 0.5108],
    [0.7, 0.3566], [0.8, 0.2231], [0.9, 0.1053]
  ]
};

_REGIONS = [
  {id: 'testRegion1', value: 'Test Region 1'},
  {id: 'testRegion2', value: 'Test Region 2'},
  {id: 'testRegion3', value: 'Test Region 3'}
];

_SPECTRAL_PERIODS = [
  {id: 'testImt1', value: 'Test IMT 1'},
  {id: 'testImt2', value: 'Test IMT 2'},
  {id: 'testImt3', value: 'Test IMT 3'}
];

_FACTORY = {
  getCurve: () => {
    return Promise.resolve(_CURVE);
  },
  getRegions: () => {
    return Promise.resolve(_REGIONS);
  },
  getSpectralPeriods: () => {
    return Promise.resolve(_SPECTRAL_PERIODS);
  }
};


describe('HazardCurveHandlerTest', () => {
  describe('constructor', () => {
    it('is defined', () => {
      expect(typeof HazardCurveHandler).to.equal('function');
    });

    it('can be instantiated', () => {
      expect(HazardCurveHandler).to.not.throw(Error);
    });

    it('can be destroyed', () => {
      var handler;

      handler = HazardCurveHandler();

      expect(handler.destroy).to.not.throw(Error);
    });
  });


  describe('get', () => {
    var handler;

    afterEach(() => {
      handler.destroy();
    });

    beforeEach(() => {
      handler = HazardCurveHandler({factory: _FACTORY});
    });


    it('calls parse query method', () => {
      sinon.stub(handler, 'parseQuery', () => { return Promise.resolve([]); });

      handler.get();

      expect(handler.parseQuery.callCount).to.equal(1);

      handler.parseQuery.restore();
    });

    it('returns a promise', () => {
      var result;

      result = handler.get({});

      expect(result).to.be.an.instanceof(Promise);
    });

    it('resolves with an array of curves', (done) => {
      sinon.stub(handler, 'parseQuery', () => {
        return Promise.resolve([{}]);
      });

      handler.get({}).then((curves) => {
        expect(curves).to.be.an.instanceof(Array);
        expect(curves.length).to.equal(1);
        expect(curves[0]).to.deep.equal(_CURVE);
      }).catch((err) => {
        return err;
      }).then(done);

      handler.parseQuery.restore();
    });
  });

  describe('parseQuery', () => {
    var handler;

    afterEach(() => {
      handler.destroy();
    });

    beforeEach(() => {
      handler = HazardCurveHandler({factory: _FACTORY});
    });


    it('rejects if required parameters are missing', (done) => {
      handler.parseQuery({}).then(() => {
        // This should be skipped because the promise should reject
        return new Error('parseQuery did not reject');
      }).catch((err) => {
        expect(err).to.be.an.instanceof(Error);
        expect(err.status).to.equal(400);
      }).then(done);
    });

    it('fills in optional parameters as appropriate', (done) => {
      handler.parseQuery({
        latitude: 0.0,
        longitude: 0.0,
        modelEdition: 'Test Edition',
        vs30: 'Test Vs30'
      }).then((queries) => {
        expect(queries.length).to.equal(_SPECTRAL_PERIODS.length);

        queries.forEach((query, index) => {
          expect(query.modelRegion).to.equal(_REGIONS[0].value);
          expect(query.spectralPeriod).to.equal(_SPECTRAL_PERIODS[index].value);
        });
      }).catch((err) => {
        return err;
      }).then(done);
    });
  });
});
