'use strict';

import WampCookieSession from './WampCookieSession';
import WampAuthChallenge from './WampAuthChallenge';
import WampConnection from './WampConnection';
import WampRequest from './WampRequest';

export default class WampFacade {
  constructor(debug = false) {
    this.debug               = debug;
    this.connection          = undefined;
    this.requests            = [];
    this._requestsOnProgress = false;

    this._initOptions();
    this._initConnection();
  }

  _initOptions() {
    this.options = {
      'lazy':                     true,
      'api_procedure':            'api',
      'url':                      'wss://' + window.location.hostname + '/wamp',
      'realm':                    'public',
      'cookie_session_name':      'sid',
      'cookie_session_separator': '~',
      'auth_secret':              window.navigator.userAgent,
    };
  }

  _initConnection() {
    if (!this.options.lazy) this.connect();
  }

  _isConnecting() {
    return this.connection && this.connection.isOnProgress();
  }

  _isConnected() {
    return this.connection && this.connection.isReady();
  }

  connect() {
    if (this._isConnected()) {
      throw new Error('WAMP. Connection already done.');
    }
    if (this._isConnecting()) {
      throw new Error('WAMP. Connection already in progress.');
    }

    let wampAuthChallenge = this._createAuthChallenge();

    let options = this.options;
    this._debugNotice(
      `Connection:`,
      `Url "${options.url}".`,
      `Realm "${options.realm}".`,
      `Authentication challenge:`, wampAuthChallenge
    );
    try {
      this.connection = new WampConnection(options.url, options.realm, wampAuthChallenge);
      this.connection
        .onOpen((connection) => this._onConnectResolve(connection))
        .onClose((reason, details) => this._onConnectReject(reason, details))
        .open();
    } catch (error) {
      this._onConnectReject('error', error);
    }

    return this;
  }

  close() {
    if (this._isConnected()) {
      this.connection.close();
      this._debugNotice(`Connection closing.`);
    }

    return this;
  }

  /**
   * If return not WampAuthChallenge instance then connection without authentication
   */
  _createAuthChallenge() {
    let options = this.options;
    this._debugNotice(
      `Cookie session:`,
      `Name "${options.cookie_session_name}".`,
      `Separator "${options.cookie_session_separator}".`
    );
    let wampCookieSession = new WampCookieSession(options.cookie_session_name, options.cookie_session_separator);

    this._debugNotice(
      `Authentication challenge:`,
      `ID "${wampCookieSession.getId()}".`,
      `Secret "${options.auth_secret}".`
    );
    return new WampAuthChallenge(wampCookieSession.getId(), options.auth_secret);
  }

  _onConnectResolve(connection) {
    this._debugNotice(`Connection ready:`, connection);
    this._runRequests();
  }

  _onConnectReject(reason, details) {
    let isClosedByClient  = false;
    let reconnectionState = 'unknown';
    let reconnectionTry   = 0;
    let reconnectionDelay = 0;
    if (details.hasOwnProperty('reason')) {
      isClosedByClient  = this.connection.isDetailsClosedByClient(details);
      reconnectionState = this.connection.getDetailsReconnectionState(details);
      reconnectionTry   = this.connection.getDetailsReconnectionTry(details);
      reconnectionDelay = this.connection.getDetailsReconnectionDelay(details);
    }
    if (isClosedByClient) {
      reason = 'closed by client';
    }

    let message = [
      `Connection closed:`,
      `Reason "${reason}".`,
    ];
    if (isClosedByClient) {
      this._debugNotice.apply(this, message);
    } else {
      message.concat([
        `Details:`, details,
        `Reconnection state "${reconnectionState}".`,
        `Reconnection try "${reconnectionTry}".`,
        `Reconnection delay "${reconnectionDelay}".`,
      ]);
      this._debugError.apply(this, message);
    }
  }

  request(procedure, data = undefined) {
    this._debugNotice(
      `Request add:`,
      `Procedure "${procedure}".`,
      `Data:`, data
    );
    let request = {
      'procedure': procedure,
      'data':      data,
      'resolve':   undefined,
      'reject':    undefined,
    };
    this.requests.push(request);

    return new Promise((resolve, reject) => {
      request.resolve = resolve;
      request.reject  = reject;

      this._runRequests();
    });
  }

  requestApi(resurce, method, data = undefined) {
    data = WampApiRequest.normalizeCallData(data);
    data.unshift(method);
    data.unshift(resurce);
    return this.request(this.options.api_procedure, data);
  }

  _runRequests() {
    if (!this._isConnected()) {
      if (this._isConnecting()) return;
      return this.connect();
    }

    if (this._requestsOnProgress) return;
    this._requestsOnProgress = true;

    for (let i in this.requests) {
      if (!this.requests.hasOwnProperty(i)) continue;
      let request = this.requests[i];

      this._debugNotice(
        `Request run:`,
        `Procedure "${request.procedure}".`,
        `Data:`, request.data
      );
      try {
        new WampRequest(this.connection)
          .request(request.procedure, request.data)
          .then(response => this._onRequestResolve(request, response))
          .catch(error => this._onRequestReject(request, error));
      } catch (error) {
        this._onRequestReject(error, request.reject);
      }
    }

    this.requests            = [];
    this._requestsOnProgress = false;
  }

  _onRequestResolve(request, response) {
    this._debugNotice(
      `Request response:`,
      `Procedure "${request.procedure}".`,
      `Data:`, request.data,
      `Response:`, response,
    );
    request.resolve(response);
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
    let log = Function.prototype.bind.call(
      isError ? console.error : console.log,
      console
    );
    log.apply(console, args);
  }
}
