'use strict';

//import BetakillerWampUserAgent from './BetakillerWampUserAgent';
import BetakillerWampSessionCookie from './BetakillerWampCookieSession';
import BetakillerWampAuthChallenge from './BetakillerWampAuthChallenge';
import BetakillerWampConnection from './BetakillerWampConnection';
import BetakillerWampRequest from './BetakillerWampRequest';

/**
 * Event "onClose" result:
 * {
 *  string reason,
 *  string detailReason,
 *  bool isClosedByClient,
 *  bool reconnectionState,
 *  int reconnectionTry,
 *  int reconnectionDelay,
 * }
 */
export default class BetakillerWampFacade {
  constructor(onOpen = undefined, onClose = undefined, debug = false) {
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.debug = debug;
    this.connection = undefined;
    this.requests = [];
    this._requestsOnProgress = false;
    this.reason_closed_by_client = 'closed_by_client';

    this.onConnectionLostHandlers = [];
    this.onConnectionRestoredHandlers = [];

    this.isConnectionLost = false;

    this.options = {
      'lazy': false,
      'api_procedure': 'api',
      'url': 'wss://' + window.location.hostname + '/wamp',
      'realm': 'public',
      'cookie_session_name': 'sid',
      'auth_secret': null, //BetakillerWampUserAgent.get(),
    };

    const started = Date.now();

    this.sessionCookie = new BetakillerWampSessionCookie(this.options.cookie_session_name);
    this.connection = new BetakillerWampConnection(this.options.url, this.options.realm, this._createAuthChallenge());

    this.connection
      .onOpen((connection) => {
        this._onConnectResolve(connection);

        const duration = Date.now() - started;

        this._debugNotice(
          `Connected in ${duration} ms`,
          `URL "${this.options.url}".`,
          `Realm "${this.options.realm}".`,
          //`Authentication challenge:`, wampAuthChallenge
        );
      })
      .onClose((reason, details) => {
        this._onConnectReject(reason, details);
      })

    if (!this.isLazyConnecting()) {
      this.connect();
    }

    this.sessionCookie.watch(() => {
      // Reconnect after session change
      this.reconnect();
    });
  }

  isLazyConnecting() {
    return this.options.lazy;
  }

  isConnecting() {
    return this.connection && this.connection.isOnProgress();
  }

  isConnected() {
    return this.connection && this.connection.isReady();
  }

  async connect() {
    if (this.isConnected()) {
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.connection
          .onOpen(resolve)
          .onClose(reject);

        if (!this.connection.isOnProgress() && !this.isConnectionLost) {
          this.connection.open();
        }
      } catch (error) {
        this._onConnectReject('error', error);
        reject();
      }
    });
  }

  async disconnect() {
    if (this.connection) {
      this.connection.close();
      //this.connection = undefined;
      this._debugNotice(`Connection closing.`);
    }
  }

  async reconnect() {
    console.log('reconnecting');
    await this.disconnect();
    await this.connect();
  }

  /**
   *
   * @param {Function} handler
   */
  onConnectionLost(handler) {
    this.onConnectionLostHandlers.push(handler);
  }

  /**
   *
   * @param {Function} handler
   */
  onConnectionRestored(handler) {
    this.onConnectionRestoredHandlers.push(handler);
  }

  /**
   * If return not BetakillerWampAuthChallenge instance then connection without authentication
   */
  _createAuthChallenge() {
    var options = this.options;
    //this._debugNotice(
    //  `Cookie session:`,
    //  `Name "${options.cookie_session_name}".`
    //);
    var sessionId = this.sessionCookie.getId();

    // Temp fix for annoying user-agent issues (constantly changing during browser updates)
    options.auth_secret = sessionId;

    this._debugNotice(
      `Authentication challenge:`,
      `ID "${sessionId}".`
      //`Secret "${options.auth_secret}".`
    );
    return new BetakillerWampAuthChallenge(sessionId, options.auth_secret);
  }

  _onConnectResolve(connection) {
    this._debugNotice(`Connection ready:`, connection);
    if (typeof this.onOpen === 'function') {
      this.onOpen(this);
    }

    // Notify subscribers about connection restored
    if (this.isConnectionLost) {
      this.onConnectionRestoredHandlers.forEach((handler) => handler());
      this.isConnectionLost = false;
    }

    this._runRequests();
  }

  _onConnectReject(reason, details) {
    var isClosedByClient = false;
    var detailReason = 'unknown';
    var reconnectionState = 'unknown';
    var reconnectionTry = 0;
    var reconnectionDelay = 0;

    var isConnectionLost = reason === 'lost' || reason === 'unreachable';

    if (details && details.hasOwnProperty('reason')) {
      isClosedByClient = this.connection.isDetailsClosedByClient(details);
      detailReason = this.connection.getDetailsReason(details);
      reconnectionState = this.connection.getDetailsReconnectionState(details);
      reconnectionTry = this.connection.getDetailsReconnectionTry(details);
      reconnectionDelay = this.connection.getDetailsReconnectionDelay(details);
    }

    if (isConnectionLost && !this.isConnectionLost) {
      // Notify subscribers about connection lost
      this.onConnectionLostHandlers.forEach((handler) => handler());
      this.isConnectionLost = true;
    }

    if (isClosedByClient) {
      reason = this.reason_closed_by_client;
    }

    var message = [
      `Connection closed:`,
      `Reason "${reason}".`,
    ];
    if (isClosedByClient || isConnectionLost) {
      this._debugNotice.apply(this, message);
    } else {
      message = message.concat([
        `Detail reason "${detailReason}".`,
        `Reconnection state "${reconnectionState}".`,
        `Reconnection try "${reconnectionTry}".`,
        `Reconnection delay "${reconnectionDelay}".`,
        `Details:`, details,
      ]);

      throw new Error(message.join(' '));
    }

    this._eventOnConnectReject(
      reason, detailReason, isClosedByClient, reconnectionState, reconnectionTry, reconnectionDelay
    );
  }

  _eventOnConnectReject(
    reason, detailReason, isClosedByClient, reconnectionState, reconnectionTry, reconnectionDelay
  ) {
    if (typeof this.onClose === 'function') {
      this.onClose({
        'reason': reason,
        'detailReason': detailReason,
        'isClosedByClient': isClosedByClient,
        'reconnectionState': reconnectionState,
        'reconnectionTry': reconnectionTry,
        'reconnectionDelay': reconnectionDelay,
      });
    }
  }

  async eventEmit(name, data = []) {
    await this.connect();

    this.connection.getSession().publish(name, data);

    this._debugNotice(
      `Event "${name}" emitted`,
      'payload: "' + JSON.stringify(data) + '"',
    );
  }

  async eventSubscribe(name, handler) {
    await this.connect();

    this._debugNotice(
      `Subscribed to event "${name}"`,
    );

    this.connection.getSession().subscribe(name, (args, kvargs) => {
      this._debugNotice(
        `Event "${name}" received`,
        'payload: "' + JSON.stringify(kvargs) + '"',
      );

      //console.log('Event', args, kwargs, details);
      handler(kvargs);
    });
  }

  async rpcCall(procedure, data = undefined, timeout = null) {
    this._debugNotice(
      `Request enqueued:`,
      `Procedure "${procedure}".`,
      `Data:`, data
    );

    var request = {
      procedure: procedure,
      data: data,
      resolve: undefined,
      reject: undefined,
      timeout: timeout,
      started: Date.now(),
    };

    //await this.connect();

    this.requests.push(request);

    return new Promise((resolve, reject) => {
      request.resolve = resolve;
      request.reject = reject;

      //this._processRequest(request);

      this._runRequests();
    });
  }

  async rpcApiCall(resource, method, data = undefined, timeout = null) {
    data = BetakillerWampRequest.normalizeCallData(data);

    return this.rpcCall(this.options.api_procedure, {
      resource,
      method,
      data
    }, timeout);
  }

  async _runRequests() {
    if (this._requestsOnProgress) {
      return;
    }

    this._requestsOnProgress = true;

    // Prevent race conditions on parallel requests
    // Keep requests during connection loss
    while (this.requests.length > 0) {
      await this.connect();

      // Do not wait for each request to be processed, run them in parallel
      this._processRequest(this.requests.pop());
    }

    this._requestsOnProgress = false;
  }

  _processRequest(request) {
    try {
      request.called = Date.now();

      new BetakillerWampRequest(this.connection)
        .request(request.procedure, request.data, request.timeout)
        .then(response => this._onRequestResolve(request, response))
        .catch(error => this._onRequestReject(request, error));

      //this._debugNotice(
      //  `Procedure "${request.procedure}" called`,
      //  `Request:`, request.data
      //);

    } catch (error) {
      this._onRequestReject(request, error);
    }
  }

  _onRequestResolve(request, response) {
    request.finished = Date.now();
    request.durationGross = request.finished - request.started;
    request.durationNet = request.finished - request.called;

    this._debugNotice(
      `Procedure "${request.procedure}"`,
      `Executed in ${request.durationNet}ms / ${request.durationGross}ms (net / gross)`,
      `Request:`, request.data,
      `Response:`, response,
    );

    switch (request.procedure) {
      case this.options.api_procedure:
        if (!response || typeof response !== 'object') {
          throw new Error('Wrong API response type ' + JSON.stringify(response) + " for request " + JSON.stringify(request));
        }

        var hasData  = response.hasOwnProperty('data') && response.hasOwnProperty('last_modified'),
            hasError = response.hasOwnProperty('error');

        if (hasError) {
          request.reject(response.error);
        } else if (hasData) {
          request.resolve(response.data, response.last_modified);
        } else {
          throw new Error('Wrong API response structure ' + JSON.stringify(response) + " for request " + JSON.stringify(request));
        }
        break;

      default:
        request.resolve(response);
        break;
    }
  }

  _onRequestReject(request, error) {
    this._debugError(
      `Request error:`,
      `Procedure "${request.procedure}".`,
      `Data:`, request.data,
      `Error:`, error,
    );
    request.reject(error);
  }

  _debugNotice(...args) {
    args.unshift(false);
    this._debug.apply(this, args);
  }

  _debugError(...args) {
    args.unshift(true);
    this._debug.apply(this, args);
  }

  _debug(isError, ...args) {
    if (!this.debug) return;
    args.unshift('[WAMP]');
    var log = Function.prototype.bind.call(
      isError ? console.error : console.log,
      console
    );
    log.apply(console, args);
  }
}
