'use strict';

export default class BetakillerWampCookieSession {
  constructor(cookieName) {
    this.cookieName = cookieName;
  }

  getId() {
    return this._readCookie(this.cookieName);
  }

  _readCookie(name) {
    var matches = document.cookie.match(new RegExp(
      "(?:^|; )" + name.replace(/([.$?*|{}()\[\]\\\/+^])/g, '\\$1') + "=([^;]*)"
    ));
    return matches ? decodeURIComponent(matches[1]) : undefined;
  }
}
