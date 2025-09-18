const express = require('express');
const session = require('express-session');
const Keycloak = require('keycloak-connect');
const https = require('https');
const fs = require('fs');
const dns = require('dns');

// Disable SSL verification for internal communication
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Custom DNS resolution to map keycloak.localhost to keycloak container
const originalLookup = dns.lookup;
dns.lookup = function(hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  
  if (hostname === 'keycloak.localhost') {
    return originalLookup.call(this, 'keycloak', options, callback);
  }
  
  return originalLookup.call(this, hostname, options, callback);
};

const app = express();
const port = process.env.HTTPS_PORT || 3443;

// Session configuration
const memoryStore = new session.MemoryStore();
app.use(session({
  secret: 'some-secret',
  resave: false,
  saveUninitialized: true,
  store: memoryStore
}));

// Keycloak configuration for browser redirects
const keycloakConfig = {
  realm: process.env.KEYCLOAK_REALM || 'demo',
  'auth-server-url': process.env.KEYCLOAK_URL || 'https://keycloak.localhost',
  'ssl-required': 'external',
  resource: process.env.KEYCLOAK_CLIENT_ID || 'demo-app',
  credentials: {
    secret: process.env.KEYCLOAK_CLIENT_SECRET || 'demo-app-secret'
  },
  'confidential-port': 0,
  'token-store': 'session',
  'bearer-only': false,
  'verify-token-audience': false,
  'disable-trust-manager': true,
  'allow-any-hostname': true,
  'truststore': false
};

// Internal configuration for server-to-server communication
const keycloakInternalConfig = {
  ...keycloakConfig,
  'auth-server-url': process.env.KEYCLOAK_INTERNAL_URL || 'https://keycloak:8443'
};

const keycloak = new Keycloak({ store: memoryStore }, keycloakConfig);

// Initialize Keycloak
app.use(keycloak.middleware());

// Set view engine
app.set('view engine', 'ejs');
app.set('views', './views');

// Routes
app.get('/', (req, res) => {
  const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token ? 
               req.kauth.grant.access_token.content : null;
  res.render('index', { user });
});

app.get('/protected', keycloak.protect(), (req, res) => {
  const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token ? 
               req.kauth.grant.access_token.content : null;
  res.render('protected', { user });
});

app.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

// HTTPS configuration
const httpsOptions = {
  key: fs.readFileSync(process.env.SSL_KEY || '/app/certs/localhost.key'),
  cert: fs.readFileSync(process.env.SSL_CERT || '/app/certs/localhost.crt')
};

https.createServer(httpsOptions, app).listen(port, '0.0.0.0', () => {
  console.log(`Demo app listening securely on HTTPS port ${port}`);
});