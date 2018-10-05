'use strict';

import WampConnection from './WampConnection';

export default class WampRequest {
  constructor(connection) {
    // todo instanceof
    this.connection = connection;
  }

  request(procedure, data = undefined) {
    data = WampRequest.normalizeCallData(data);
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
      return data;
    }
    if (data instanceof Array) {
      return data;
    }
    if (typeof data instanceof Object) {
      data = this._objectToArray(data);
    } else {
      data = [data];
    }
    return data;
  }

  _objectToArray(data) {
    return Object.keys(data).map(function (key) {
      return data[key];
    });
  }
}
