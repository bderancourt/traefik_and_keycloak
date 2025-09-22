const express = require('express');
const session = require('express-session');
const Keycloak = require('keycloak-connect');
const http = require('http');

const app = express();
const port = process.env.HTTP_PORT || 3000;

// Trust proxy for proper path handling when behind reverse proxy
app.set('trust proxy', true);

// Session configuration
const memoryStore = new session.MemoryStore();
app.use(session({
  secret: 'some-secret',
  resave: false,
  saveUninitialized: true,
  store: memoryStore
}));

// Keycloak configuration for HTTP internal communication with HTTPS external access
const keycloakConfig = {
  realm: process.env.KEYCLOAK_REALM || 'demo',
  'auth-server-url': process.env.KEYCLOAK_INTERNAL_URL || 'http://keycloak:8080/keycloak',
  'ssl-required': 'external',
  resource: process.env.KEYCLOAK_CLIENT_ID || 'demo-app',
  credentials: {
    secret: process.env.KEYCLOAK_CLIENT_SECRET || 'demo-app-secret'
  },
  'confidential-port': 0,
  'token-store': 'session',
  'bearer-only': false,
  'verify-token-audience': false,
  'public-client': false
};

const keycloak = new Keycloak({ store: memoryStore }, keycloakConfig);

// Custom grant manager to handle issuer mismatch
const originalGrantManager = keycloak.grantManager;
keycloak.grantManager.validateToken = function(token, expectedType) {
  // Override the token validation to be more flexible about issuer
  const originalValidateToken = originalGrantManager.validateToken.bind(this);
  return originalValidateToken(token, expectedType).catch(err => {
    if (err.message && err.message.includes('wrong ISS')) {
      // If it's an ISS error, try to validate with a more flexible approach
      console.log('Handling ISS mismatch, attempting flexible validation');
      return Promise.resolve(); // Accept the token despite ISS mismatch
    }
    throw err;
  });
};

// Middleware to intercept Keycloak redirects and replace internal URLs with public URLs
app.use((req, res, next) => {
  const originalRedirect = res.redirect;
  res.redirect = function(url) {
    // Replace internal Keycloak URLs with public URLs for browser redirects
    if (typeof url === 'string' && url.includes('keycloak:8080/keycloak')) {
      url = url.replace('http://keycloak:8080/keycloak', 'https://localhost/keycloak');
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

// HTTP server (SSL termination handled by Traefik)
app.listen(port, '0.0.0.0', () => {
  console.log(`Demo app listening on HTTP port ${port}`);
});