'use strict';

import WampRequest from './WampRequest';

export default class WampApiRequest extends WampRequest {
  constructor(connection, procedure = 'api') {
    super(connection);
    this.procedure = procedure || 'api';
  }

  request(resurce, method, data = undefined) {
    data = WampApiRequest.normalizeCallData(data);
    data.unshift(method);
    data.unshift(resurce);
    return super.request(this.procedure, data);
  }
}
