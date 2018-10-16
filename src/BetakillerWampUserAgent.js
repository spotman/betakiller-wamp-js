'use strict';

export default class BetakillerWampUserAgent {
  static get() {
    if (!this.userAgnet) {
      this.userAgnet = window.navigator.userAgent;
      this.userAgnet = this._normalizeIe11AndLater(this.userAgnet);
      return this.userAgnet;
    }

    return this.userAgnet;
  }

  static _normalizeIe11AndLater(value) {
    var isIe = !!window.MSInputMethodContext && !!document.documentMode;
    if (!isIe) return value;
    value = value.replace(/(Trident\/[0-9\.]+;) .+?; (rv:)/i, '$1 $2');
    return value;
  }
}
