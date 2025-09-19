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

// Trust proxy for proper path handling when behind reverse proxy
app.set('trust proxy', true);

// Middleware to provide base path to templates
app.use((req, res, next) => {
  res.locals.basePath = '/app';
  next();
});

// Middleware to fix the request URL for Keycloak redirect URIs
app.use((req, res, next) => {
  // Override the originalUrl to include the base path for Keycloak
  if (req.headers['x-forwarded-prefix'] || req.url.includes('auth_callback')) {
    const basePath = '/app';
    if (!req.originalUrl.startsWith(basePath)) {
      req.originalUrl = basePath + req.originalUrl;
    }
  }
  next();
});

// Session configuration
const memoryStore = new session.MemoryStore();
app.use(session({
  secret: 'some-secret',
  resave: false,
  saveUninitialized: true,
  store: memoryStore
}));

// Hybrid Keycloak configuration that uses internal URL for server communication
// but allows browser redirects to work correctly
const keycloakConfig = {
  realm: process.env.KEYCLOAK_REALM || 'demo',
  'auth-server-url': process.env.KEYCLOAK_INTERNAL_URL || 'https://keycloak:8443',
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
  'truststore': false,
  'public-client': false
};

const keycloak = new Keycloak({ store: memoryStore }, keycloakConfig);

// Middleware to intercept Keycloak redirects and replace internal URLs with public URLs
app.use((req, res, next) => {
  const originalRedirect = res.redirect;
  res.redirect = function(url) {
    // Replace internal Keycloak URLs with public URLs for browser redirects
    if (typeof url === 'string' && url.includes('keycloak:8443/keycloak')) {
      url = url.replace('https://keycloak:8443/keycloak', 'https://localhost/keycloak');
    }
    return originalRedirect.call(this, url);
  };
  next();
});

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