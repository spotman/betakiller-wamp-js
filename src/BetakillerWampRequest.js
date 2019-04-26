'use strict';

import BetakillerWampConnection from './BetakillerWampConnection';

export default class BetakillerWampRequest {
  constructor(connection) {
    if (!(connection instanceof BetakillerWampConnection)) {
      throw new Error('Invalid connection instance. Valid: BetakillerWampConnection');
    }
    this.connection = connection;
  }

  request(procedure, data = undefined, timeout = null) {
    data = BetakillerWampRequest.normalizeCallData(data);

    timeout = timeout || 10000; // 10 seconds by default

    var session = this.connection.getSession();

    return new Promise((resolve, reject) => {
        var p = Array.isArray(data)
          ? session.call(procedure, data)
          : session.call(procedure, [], data);

      var timer = setTimeout(() => {
        reject({
          'procedure': procedure,
          'data': data,
          'message': 'WAMP request timeout'
        });
      }, timeout);

      p
          .then(response => {
            clearTimeout(timer);
            resolve(response);
          })
          .catch(error => {
            clearTimeout(timer);
            reject({
              'procedure': procedure,
              'data': data,
              'message': error
            });
          });
    });
  }

  static normalizeCallData(data) {
    if (data === null || data === undefined) {
      return [];
    }

    if (data instanceof Array || data instanceof Object) {
      return data;
    }

    throw new Error("Request arguments must be an indexed array or named object");
  }
}
