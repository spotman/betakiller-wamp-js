'use strict';

export default class BetakillerWampCookieSession {
  constructor(cookieName, cookieSeparator = undefined) {
    this.cookieName      = cookieName;
    this.cookieSeparator = cookieSeparator;
  }

  getId() {
    let id = this._readCookie(this.cookieName);
    if (this.cookieSeparator) {
      id = id.split(this.cookieSeparator, 2);
      id = id[id.length - 1];
    }
    return id;
  }

  _readCookie(name) {
    var matches = document.cookie.match(new RegExp(
      "(?:^|; )" + name.replace(/([.$?*|{}()\[\]\\\/+^])/g, '\\$1') + "=([^;]*)"
    ));
    return matches ? decodeURIComponent(matches[1]) : undefined;
  }
}
