'use strict';

import BetakillerWampRequest from './BetakillerWampRequest';

export default class BetakillerWampApiRequest extends BetakillerWampRequest {
  constructor(connection, procedure = 'api') {
    super(connection);
    this.procedure = procedure || 'api';
  }

  request(resource, method, data = undefined) {
    data = BetakillerWampApiRequest.normalizeCallData(data);
    data.unshift(method);
    data.unshift(resource);
    return super.request(this.procedure, data);
  }
}
