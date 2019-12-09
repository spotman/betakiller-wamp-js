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

    this.options = {
      'lazy': false,
      'api_procedure': 'api',
      'url': 'wss://' + window.location.hostname + '/wamp',
      'realm': 'public',
      'cookie_session_name': 'sid',
      'auth_secret': null, //BetakillerWampUserAgent.get(),
    };

    this.sessionCookie = new BetakillerWampSessionCookie(this.options.cookie_session_name);

    this._initConnection();

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

  _initConnection() {
    if (!this.isLazyConnecting()) this.connect();
  }

  connect() {
    if (this.isConnected()) {
      throw new Error('WAMP. Connection already done.');
    }
    if (this.isConnecting()) {
      throw new Error('WAMP. Connection already in progress.');
    }

    var wampAuthChallenge = this._createAuthChallenge();

    var options = this.options;
    this._debugNotice(
      `Connection:`,
      `Url "${options.url}".`,
      `Realm "${options.realm}".`,
      `Authentication challenge:`, wampAuthChallenge
    );
    try {
      this.connection = new BetakillerWampConnection(options.url, options.realm, wampAuthChallenge);
      this.connection
        .onOpen((connection) => this._onConnectResolve(connection))
        .onClose((reason, details) => this._onConnectReject(reason, details))
        .open();
    } catch (error) {
      this._onConnectReject('error', error);
    }

    return this;
  }

  disconnect() {
    if (this.connection) {
      this.connection.close();
      this.connection = undefined;
      this._debugNotice(`Connection closing.`);
    }

    return this;
  }

  reconnect() {
    console.log('reconnecting');
    this.disconnect();
    this.connect();
  }

  /**
   * If return not BetakillerWampAuthChallenge instance then connection without authentication
   */
  _createAuthChallenge() {
    var options = this.options;
    this._debugNotice(
      `Cookie session:`,
      `Name "${options.cookie_session_name}".`
    );
    var sessionId = this.sessionCookie.getId();

    // Temp fix for annoying user-agent issues (constantly changing during browser updates)
    options.auth_secret = sessionId;

    this._debugNotice(
      `Authentication challenge:`,
      `ID "${sessionId}".`,
      `Secret "${options.auth_secret}".`
    );
    return new BetakillerWampAuthChallenge(sessionId, options.auth_secret);
  }

  _onConnectResolve(connection) {
    this._debugNotice(`Connection ready:`, connection);
    if (typeof this.onOpen === 'function') {
      this.onOpen(this);
    }
    this._runRequests();
  }

  _onConnectReject(reason, details) {
    var isClosedByClient = false;
    var detailReason = 'unknown';
    var reconnectionState = 'unknown';
    var reconnectionTry = 0;
    var reconnectionDelay = 0;
    if (details.hasOwnProperty('reason')) {
      isClosedByClient = this.connection.isDetailsClosedByClient(details);
      detailReason = this.connection.getDetailsReason(details);
      reconnectionState = this.connection.getDetailsReconnectionState(details);
      reconnectionTry = this.connection.getDetailsReconnectionTry(details);
      reconnectionDelay = this.connection.getDetailsReconnectionDelay(details);
    }
    if (isClosedByClient) {
      reason = this.reason_closed_by_client;
    }

    var message = [
      `Connection closed:`,
      `Reason "${reason}".`,
    ];
    if (isClosedByClient) {
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
    if (typeof this.onClose !== 'function') return;
    this.onClose({
      'reason': reason,
      'detailReason': detailReason,
      'isClosedByClient': isClosedByClient,
      'reconnectionState': reconnectionState,
      'reconnectionTry': reconnectionTry,
      'reconnectionDelay': reconnectionDelay,
    });
  }

  eventEmit(name, data = []) {
    if (!this.isConnected()) {
      if (this.isConnecting()) {
        return;
      }

      return this.connect();
    }

    this.connection.getSession().publish(name, data);
  }

  eventSubscribe(name, handler) {
    if (!this.isConnected()) {
      if (this.isConnecting()) {
        return;
      }

      return this.connect();
    }

    this.connection.getSession().subscribe(name, (args, kvargs) => {
      //console.log('Event', args, kwargs, details);
      handler(kvargs);
    });
  }

  rpcCall(procedure, data = undefined, timeout = null) {
    this._debugNotice(
      `Request add:`,
      `Procedure "${procedure}".`,
      `Data:`, data
    );
    var request = {
      'procedure': procedure,
      'data': data,
      'resolve': undefined,
      'reject': undefined,
      'timeout': timeout
    };
    this.requests.push(request);

    return new Promise((resolve, reject) => {
      request.resolve = resolve;
      request.reject = reject;

      this._runRequests();
    });
  }

  rpcApiCall(resource, method, data = undefined, timeout = null) {
    data = BetakillerWampRequest.normalizeCallData(data);

    return this.rpcCall(this.options.api_procedure, {
      resource,
      method,
      data
    }, timeout);
  }

  _runRequests() {
    if (!this.isConnected()) {
      if (this.isConnecting()) {
        return;
      }

      return this.connect();
    }

    if (this._requestsOnProgress) {
      return;
    }

    this._requestsOnProgress = true;

    // Prevent race conditions on parallel requests
    while (this.requests.length > 0) {
      this._processRequest(this.requests.pop());
    }

    this._requestsOnProgress = false;
  }

  _processRequest(request) {
    this._debugNotice(
      `Request run:`,
      `Procedure "${request.procedure}".`,
      `Data:`, request.data
    );

    try {
      new BetakillerWampRequest(this.connection)
        .request(request.procedure, request.data, request.timeout)
        .then(response => this._onRequestResolve(request, response))
        .catch(error => this._onRequestReject(request, error));
    } catch (error) {
      this._onRequestReject(request, error);
    }
  }

  _onRequestResolve(request, response) {
    this._debugNotice(
      `Request response:`,
      `Procedure "${request.procedure}".`,
      `Data:`, request.data,
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
    args.unshift('WAMP.');
    var log = Function.prototype.bind.call(
      isError ? console.error : console.log,
      console
    );
    log.apply(console, args);
  }
}
