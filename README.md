# betakiller-wamp-js
JavaScript facade for BetaKiller WAMP transport

# Use
```
import BetakillerWampFacade from '@betakiller/wamp-wrapper';
const WampFacade = new BetakillerWampFacade;
WampFacade
  .rpcApiCall('validation', 'userEmail', 'login@domain.tld')
  .then(response => console.log('Request response:', response))
  .catch(error => console.error('Request error:', error));
```
```
// Import NPM module
import BetakillerWampFacade from '@betakiller/wamp-wrapper';

// Creating instance of WAMP facade
const WampFacade = new BetakillerWampFacade(
  // Event on resolve connecting
  (facade)=>console.log('Connecting result:', facade),
  // Event on reject/error connecting
  (data)=>console.log('Connecting error:', data),
  // Debug mode
  true
);

// Creating WAMP request
WampFacade
  // Request: string uri, string|array data
  //.request('api', ['validation', 'userEmail', 'login@domain.tld'])
  // Request RPC API: string resource, string method, string|array data
  .rpcApiCall('validation', 'userEmail', 'login@domain.tld')
  // Event on resolve request
  .then(response => console.log('Request response:', response))
  // Event on reject/error request
  .catch(error => console.error('Request error:', error));
```

# Install
- [Installing Node.js via package manager](https://nodejs.org/en/download/package-manager)

