'use strict';

var events = require('events');


function Monitor () {
  this.connectionStatus = false;
  this.requestInProgress = false;
  this.timer = null;
  this.callbackQueue = [];
  this.polling = false;

  this.config = {
    interval: 15000,        // Time to wait before initiating each test
    timeout: 15000,         // Time to wait before deeming test a failure
    http: null,             // Custom HTTP support
    path: '/sys/info/ping'  // Default endpoint for tests
  };
}

// Object.create inheritance reduces the lib size the most...
Monitor.prototype = Object.create(events.EventEmitter.prototype);

/**
 * Runs the actual connection test code
 * @return {Promise}
 */
Monitor.prototype.doTest =function (callback) {
  if (this.requestInProgress) {
    this.callbackQueue.push(callback);
  } else {
    // Clear the timer if one is present
    clearTimeout(this.timer);
    this.timer = null;

    // Queue the resposne
    this.callbackQueue.push(callback);

    // Flag that a request is ongoing
    this.requestInProgress = true;

    // Do the request using the appropriate interface
    var http = this.config.http || $fh.cloud;

    http(
      {
        method: 'get',
        timeout: this.config.timeout,
        path: this.config.path
      },
      onTestComplete.bind(this, 'connected', true),
      onTestComplete.bind(this, 'disconnected', false)
    );
  }
};


/**
 * Returns the last test information
 * @return {Object}
 */
Monitor.prototype.getStatus = function () {
  return this.connectionState;
};


/**
 * Returns the latest connected Boolean
 * @return {Boolean}
 */
Monitor.prototype.isConnected = function () {
  return this.connectionState.connected;
};


/**
 * Simply makes a call to the cloud to check internet connectivity.
 * Resolves if the call succeeds. Rejects if it fails for any reason.
 * @return {Promise}
 */
Monitor.prototype.startPolling = function () {
  // Don't allow multiple start calls
  if (this.polling) {
    console.warn('Called Monitor.startPolling again. This method should not' +
      ' be called twice unless stop was called in bewteen.');
    return false;
  } else {
    this.polling = true;
    this.doTest(function () {});
    this.emit('started');
    return true;
  }
};


/**
 * Simply makes a call to the cloud to check internet connectivity.
 * Resolves if the call succeeds. Rejects if it fails for any reason.
 * @return {Promise}
 */
Monitor.prototype.stopPolling = function () {
  if (this.timer !== null) {
    this.polling = false;
    clearTimeout(this.timer);
    this.timer = null;
    this.emit('stopped');

  } else if (this.requestInProgress) {
    var self = this;

    this.once('connectionState', function () {
      // Call stop once we know a new request is queued
      self.stopPolling();
    });
  }
};


/**
 * Called once the test has passed or failed.
 * @param  {String}   evt         Event to emit if the state has changed
 * @param  {Boolean}  connected   Flag singalling success
 */
function onTestComplete (evt, connected) {
  /*jshint validthis:true */
  this.requestInProgress = false;
  this.lastTest = Date.now();

  // Set state we found, i.e true/false
  this.connectionStatus = {
    connected: true,
    ts: Date.now()
  };

  // If state has changed alert the user with a direct event
  if (this.connectionStatus.connected === connected) {
    this.emit(evt);
  }

  // Respond to callbacks
  for (var i = 0; i < this.callbackQueue.length; i++) {
    this.callbackQueue[i](connected);
  }
  this.callbackQueue = [];

  // Queue the next check
  if (this.polling) {
    this.timer = setTimeout(this.doTest.bind(this), this.config.interval);
  }

  // Let everyone know the latest connection state update
  this.emit('connectionState', this.connectionStatus);
}


module.exports = new Monitor();
module.exports.Ctor = Monitor;
