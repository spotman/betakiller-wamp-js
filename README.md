# betakiller-wamp-js
JavaScript facade for BetaKiller WAMP transport

# Use
var WampFacade = require('betakiller-wamp-js');
WampFacade
  .request('api', ['validation', 'userEmail', 'login@domain.tld'])
  .then(response => console.log('Request response:', response))
  .catch(error => console.error('Request error:', error));

# Install Node.js
- [Install](https://nodejs.org/en/download/package-manager) `node.js`

