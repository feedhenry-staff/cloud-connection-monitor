Connectivity Monitor
====================

Tiny (~6KB) module that can be used in Cordova / Web applications to monitor
internet connectivity to ~~the FeedHenry~~ any cloud. This is necessary as the
Cordova Connection plugin does not give us an indication of whether the
FeedHenry cloud is actually available and can also give false positives; having
WiFi does not mean an internet connection is present for example.

This module works by polling the _sys/info/ping_ enpoint of your cloud
application at set intervals and reporting when the connection state changes.

Internally this uses _Object.create_ for lazy inheritance. If you need to
support IE8 or other older browsers feel free to add a patch PR.

## Prerequisites
By default, this module assumes that the FeedHenry SDK is available and
window.$fh.cloud is defined. If you want to bypass or not use the SDK you
must set _Monitor.config.http_ to function that performs the request. It must
accept an options object, success callback, and failure callback. An example of
using a custom http interface is at the end of this README.

## Usage

#### Script Tag in index.html
Clone this repository and run:

```
npm i
npm run-script bundle
```

```javascript
// Use the exposed instance...
window.ConnectionMonitor.startPolling();

// ...or create your own instances
var cm = new window.ConnectionMonitor.Ctor();
```

Take one of the files in _/dist_ place it in index.html, and you're good to go!

#### Browserify

```javascript
var ConnectionMonitor = require('cloud-connection-monitor');

// Use the exposed instance...
ConnectionMonitor.startPolling();

// ...or create your own instances
var cm = new ConnectionMonitor.Ctor();
```


## API
The monitor has a lightweight API and exposes 5 functions. The monitor
inherits from _events.EventEmitter_ so you can bind events as detailed in the
usual Node.js style.

#### Events
Instances inherit from the Node.js EventEmitter class so using events is simple.
Supported events are:

* **started** - Fires when _startPolling_ is called.
* **stopped** - Fires when polling has completed stopped. Calling _stopPolling_
will not cancel any requests that have been initiated; therefore this is the
most reliable way to be certain polling has completed.
* **connected** - Emitted when connection changes from 'disconneted' to
'connected'.
* **disconnected** - Emitted when connection changes from 'connected' to
'disconnected'.
* **connectionState** - Emitted each time a test completes. The event handler
receives a connectionState object as detailed in _Monitor.getStatus()_.

Exmaple event bindings:

```javascript
var ConnectionMonitor = require('cloud-connection-monitor');

// app.init is called once we get a connection
ConnectionMonitor.once('connected', app.init);

// Each time polling gets a result log it
ConnectionMonitor.on('connectionState', app.log.debug);

// Use the exposed instance...
ConnectionMonitor.startPolling();
```

See the [EventEmitter docs](https://nodejs.org/api/events.html) for more.


#### ConnectionMonitor.Ctor
Pointer to the ConnectionMonitor constructor. Typically it is expected that you
will use the Monitor instance exposed by _requireing_ it or by
_window.ConnectionMonitor_, but if you want to create new instances you can do
so this way. You might need this if you need to monitor availability of a
different host to your FeedHenry instance.

```javascript
var ConnectionMonitor = require('cloud-connection-monitor');

var m = new ConnectionMonitor.Ctor();
```

#### ConnectionMonitor.isConnected()
Returns the latest known connection state as a Boolean.

#### ConnectionMonitor.getStatus()
Returns the latest status as an object like so:

```javascript
var s = ConnectionMonitor.getStatus()
s.connected  // {Boolean} Are we connected?
s.ts         // {Number}  The timestamp (in ms) at which this state recorded
```

#### ConnectionMonitor.doTest(callback)
Runs a one time connectivity test. You can pass an optional callback with the
signature _fn(connected)_ where connected will be a Boolean.


#### ConnectionMonitor.startPolling()
Starts a polling process. This process will continully call
_ConnectionMonitor.doTest_ at the interval specfied by
_ConnectionMonitor.config.interval_.


#### ConnectionMonitor.stopPolling()
Stops the polling process. If a request is currently started it will not be
cancelled.

#### ConnectionMonitor.config
This object stores configuration properties. Currently just two are required:

* **timeout** - Time (in ms) to wait before killing a test. If calling the _path_
specified in config exceeds this number we deem the device to be offline.
Defaults to 15000 (15 seconds)
* **interval** - Number of milliseconds to wait to poll after a previous doTest has
completed. Default to 15000 (15 seconds).
* **path** - The cloud path to use as a polling endpoint. Defaults to
_/sys/info/ping_ as it is present in all applications and is very lightweight.
* **http** - Provide a function with the signature _fn(opts, success, fail)_ to add
your own http interface if you are not usign the FeedHenry SDK.

## Custom HTTP Example
If you wanto to use this, but not include the FeedHenry JavaScript SDK in your
application you must override the _config.http_ property of any Monitor
instance you create. An example is provided.


```javascript
var cm = require('cloud-connection-monitor'),
	customHttp = require('my-custom-http');

cm.config.http = function (params, success, fail) {
  // Params looks like this:
  // {
  //    timeout: 15000,
  //    interval: 15000,
  //    path: '/sys/info/ping'
  // }

  customHttp.get(params, function (err, res) {
    if (err) {
      fail()
    } else {
      success();
    }
  });
}
```

## Contributions
Contributions are weclome, no strict rules as such. Ensure calls to
_npm run-script bundle_, _npm test_ and _npm run-script lint_ work and that you
add new tests to cover your work.
