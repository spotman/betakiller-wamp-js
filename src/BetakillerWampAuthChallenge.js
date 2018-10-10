'use strict';

var autobahn = require('autobahn-browser');

export default class BetakillerWampAuthChallenge {
  constructor(authId, secretKey) {
    this.method    = 'wampcra';
    this.authId    = authId;
    this.secretKey = secretKey;
  }

  getMethod() {
    return this.method;
  }

  getAuthId() {
    return this.authId;
  }

  run(session, method, extra) {
    if (method !== this.method) {
      throw new Error(`Unknown method "${method}". Valid method "${this.method}".`);
    }

    var key = this.secretKey;
    if (typeof extra.salt !== 'undefined') {
      key = autobahn.auth_cra.derive_key(key, extra.salt);
    }

    return autobahn.auth_cra.sign(key, extra.challenge);
  }
}
