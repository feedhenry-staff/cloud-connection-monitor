'use strict';

// Bind fh-mocks globally (i.e window.$fh or global.$fh)
require('fh-mocks');

var expect = require('chai').expect
  , sinon = require('sinon')
  , Monitor = require('../index.js').Ctor;

describe('Connection Monitor', function () {
  var m = null;

  beforeEach(function () {
    m = new Monitor();

    $fh.createApiShim('cloud');
  });

  afterEach(function () {
    $fh.restoreOriginalApi('cloud');
  });

  describe('#startPolling', function () {
    it('Should set polling to true', function () {
      var res = m.startPolling();

      expect(res).to.be.true;
      expect(m.polling).to.be.true;
    });

    it('Should return false for a second call', function () {
      var fCall = m.startPolling()
        , sCall = m.startPolling();

      expect(fCall).to.be.true;
      expect(sCall).to.be.false;
      expect(m.polling).to.be.true;
    });

    it('Should emit a connectionState event', function (done) {
      // Setup fh.cloud expect
      $fh.cloud.expect({
        path: m.config.path,
        timeout: m.config.timeout,
        method: 'get'
      })
        .setResponse(null, 'ok');

      m.once('connectionState', function (state) {
        done();
      });

      // Start polling
      m.startPolling();

      $fh.cloud.flush();
    });
  });

  describe('#stopPolling', function () {

    it('Should run successfully', function () {
      m.stopPolling();
    });

    it('Should stop polling once the current request completes', function (done) {
      var spy = sinon.spy();

      // Setup fh.cloud expect
      $fh.cloud.expect({
        path: m.config.path,
        timeout: m.config.timeout,
        method: 'get'
      })
        .setResponse(null, 'ok');

      // Bind event for poll
      m.on('connectionState', spy);

      // Start the polling process
      m.startPolling();

      // Now immediately call stop, but we'll need to wait!
      m.stopPolling();

      // Wait a bit and cancel the poll call
      m.on('stopped', function () {
        expect(m.timer).to.be.null;
        expect(m.polling).to.be.false;
        expect(spy.called).to.be.true;
        done();
      });

      // Flush reuqest(s)
      $fh.cloud.flush();
    });

    it('Should stop polling immediately', function (done) {
      var spy = sinon.spy();

      // Setup fh.cloud expect
      $fh.cloud.expect({
        path: m.config.path,
        timeout: m.config.timeout,
        method: 'get'
      })
        .setResponse(null, 'ok');

      // Start the polling process
      m.startPolling();

      // Bind event for poll
      m.on('connectionState', spy);

      // Flush reuqest(s)
      $fh.cloud.flush();

      // Wait a bit and cancel the poll call
      setTimeout(function () {
        expect(m.timer).to.be.defined;
        expect(m.timer).to.not.be.null;
        expect(m.polling).to.be.true;

        // Stop polling. Should immediately remove timer since new request
        // is queued but not started
        m.stopPolling();

        expect(m.timer).to.be.null;
        expect(m.polling).to.be.false;
        expect(spy.calledOnce).to.be.true;
        done();
      }, 10);
    });

  });

  // describe('#doTest');

  // describe('#getStatus');

});
