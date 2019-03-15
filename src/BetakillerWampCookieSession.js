'use strict';

export default class BetakillerWampCookieSession {
  constructor(cookieName) {
    this.cookieName = cookieName;
    this.sid = this._read(); // Initial read
  }

  getId() {
    return this.sid;
  }

  watch(handler, timeout = 1000) {
    if (typeof handler !== 'function') {
      throw new Error('Handler must be a function');
    }

    // Poll for cookie change (new session created in other tab)
    setInterval(() => {
      const newSid = this._read();

      if (newSid !== this.sid && handler) {
        this.sid = newSid;
        handler(newSid);
      }
    }, timeout);
  }

  _read() {
    var matches = document.cookie.match(new RegExp(
      "(?:^|; )" + this.cookieName.replace(/([.$?*|{}()\[\]\\\/+^])/g, '\\$1') + "=([^;]*)"
    ));
    const value = matches ? decodeURIComponent(matches[1]) : null;

    if (!value) {
      throw new Error("Can not detect session ID from cookie " + this.cookieName);
    }

    return value;
  }
}
