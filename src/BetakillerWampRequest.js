'use strict';

import BetakillerWampConnection from './BetakillerWampConnection';

export default class BetakillerWampRequest {
  constructor(connection) {
    if (!(connection instanceof BetakillerWampConnection)) {
      throw new Error('Invalid connection instance. Valid: BetakillerWampConnection');
    }
    this.connection = connection;
  }

  request(procedure, data = undefined) {
    data = BetakillerWampRequest.normalizeCallData(data);
    return new Promise((resolve, reject) => {
      return this.connection
        .getSession()
        .call(procedure, data)
        .then(response => resolve(response))
        .catch(error => reject({'procedure': procedure, 'data': data, 'message': error}));
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
