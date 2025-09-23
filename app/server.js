const express = require('express');
const session = require('express-session');
const Keycloak = require('keycloak-connect');

const app = express();
const port = process.env.HTTP_PORT || 3000;
const domain = process.env.DOMAIN || 'localhost';

// Trust proxy for proper path handling when behind reverse proxy
app.set('trust proxy', true);

// Session configuration
const memoryStore = new session.MemoryStore();
app.use(session({
  secret: process.env.SESSION_SECRET || 'some-secret-key-change-in-production',
  resave: false,
  saveUninitialized: true,
  store: memoryStore,
  cookie: {
    secure: false, // Set to true if you want HTTPS-only cookies
    maxAge: 30 * 60 * 1000 // 30 minutes
  }
}));

// Initialize Keycloak configuration dynamically using environment variables
const keycloakConfigOriginal = {
  "realm": process.env.KEYCLOAK_REALM || "demo",
  "auth-server-url": process.env.KEYCLOAK_URL || `https://${domain}/keycloak`,
  "ssl-required": "external",
  "resource": process.env.KEYCLOAK_CLIENT_ID || "demo-app",
  "credentials": {
    "secret": process.env.KEYCLOAK_CLIENT_SECRET || "demo-app-secret"
  },
  "confidential-port": 0
};

const internalUrl = process.env.KEYCLOAK_INTERNAL_URL || 'http://keycloak:8080/keycloak';
const externalUrl = keycloakConfigOriginal['auth-server-url'];

console.log('[KEYCLOAK CONFIG] External URL (for consistency):', externalUrl);
console.log('[KEYCLOAK CONFIG] Internal URL (for connection):', internalUrl);

// Use external URL for Keycloak configuration to maintain ISS consistency
const keycloak = new Keycloak({ 
  store: memoryStore 
}, keycloakConfigOriginal); // Keep original config with external URL

console.log('[KEYCLOAK CONFIG] Keycloak initialized with URL:', keycloak.grantManager.realmUrl);

// Override HTTP requests to redirect internal calls to the internal service
const http = require('http');
const https = require('https');
const originalHttpRequest = http.request;
const originalHttpsRequest = https.request;

// Intercept HTTP requests to Keycloak and redirect to internal service
http.request = function(options, callback) {
  if (typeof options === 'string') {
    options = new URL(options);
  }
  
  // Redirect external Keycloak URLs to internal service
  if (options.hostname === domain && options.path && options.path.includes('/keycloak')) {
    console.log('[KEYCLOAK] Redirecting HTTP request from external to internal service');
    options.hostname = 'keycloak';
    options.port = 8080;
    options.protocol = 'http:';
    
    // Add forwarded headers so Keycloak knows the original external context
    if (!options.headers) options.headers = {};
    options.headers['X-Forwarded-Proto'] = 'https';
    options.headers['X-Forwarded-Host'] = domain;
    options.headers['X-Forwarded-Port'] = '443';
    options.headers['X-Forwarded-For'] = '127.0.0.1';
    console.log('[KEYCLOAK] Added forwarded headers for backend validation');
  }
  
  return originalHttpRequest.call(this, options, callback);
};

https.request = function(options, callback) {
  if (typeof options === 'string') {
    options = new URL(options);
  }
  
  // Redirect external Keycloak URLs to internal service
  if (options.hostname === domain && options.path && options.path.includes('/keycloak')) {
    console.log('[KEYCLOAK] Redirecting HTTPS request from external to internal service');
    options.hostname = 'keycloak';
    options.port = 8080;
    options.protocol = 'http:';
    
    // Add forwarded headers so Keycloak knows the original external context
    if (!options.headers) options.headers = {};
    options.headers['X-Forwarded-Proto'] = 'https';
    options.headers['X-Forwarded-Host'] = domain;
    options.headers['X-Forwarded-Port'] = '443';
    options.headers['X-Forwarded-For'] = '127.0.0.1';
    console.log('[KEYCLOAK] Added forwarded headers for backend validation');
    
    // Use HTTP instead of HTTPS for internal communication
    return originalHttpRequest.call(this, options, callback);
  }
  
  return originalHttpsRequest.call(this, options, callback);
};

// Enhanced logging for Keycloak operations
const originalObtainFromCode = keycloak.grantManager.obtainFromCode.bind(keycloak.grantManager);

keycloak.grantManager.obtainFromCode = function(...args) {
  console.log('[KEYCLOAK] obtainFromCode - using realmUrl:', this.realmUrl);
  return originalObtainFromCode(...args)
    .then(result => {
      console.log('[KEYCLOAK] obtainFromCode success:', {
        access_token: result.access_token ? 'present' : 'missing',
        refresh_token: result.refresh_token ? 'present' : 'missing'
      });
      return result;
    })
    .catch(error => {
      console.error('[KEYCLOAK] obtainFromCode error:', error.message);
      throw error;
    });
};

// Set up Keycloak middleware
app.use(keycloak.middleware({
  logout: '/logout',
  admin: '/'
}));

// Enhanced middleware to log all requests
app.use((req, res, next) => {
  console.log('[KEYCLOAK MIDDLEWARE] Processing request:', req.path);
  if (req.kauth && req.kauth.grant) {
    console.log('[KEYCLOAK MIDDLEWARE] User authenticated with grant');
  } else {
    console.log('[KEYCLOAK MIDDLEWARE] No authentication found');
  }
  next();
});

// Set view engine
app.set('view engine', 'ejs');
app.set('views', './views');

// Routes
app.get('/', (req, res) => {
  if (req.kauth && req.kauth.grant) {
    // User is authenticated - show protected content
    res.render('index', {
      user: req.kauth.grant.access_token.content,
      authenticated: true
    });
  } else {
    // User is not authenticated - show login page
    res.render('index', {
      user: null,
      authenticated: false
    });
  }
});

app.get('/login', keycloak.protect(), (req, res) => {
  // If we reach here, user is authenticated
  res.redirect('/');
});

app.get('/logout', (req, res) => {
  delete req.session['keycloak-token'];
  req.logout();
  res.redirect('/');
});

app.listen(port, () => {
  console.log(`Demo app listening on HTTP port ${port}`);
});
