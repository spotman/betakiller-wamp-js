'use strict';

export default class BetakillerWampCookieSession {
  constructor(cookieName) {
    this.cookieName = cookieName;
  }

  getId() {
    const id = this._readCookie(this.cookieName);

    if (!id) {
      throw new Error("Can not detect session ID from cookie " + this.cookieName);
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
