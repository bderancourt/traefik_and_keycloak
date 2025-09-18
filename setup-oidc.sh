#!/bin/bash

# Script to set up Keycloak realm and test OIDC Authorization Code Flow

set -e

echo "🔧 Setting up Keycloak realm for OpenID Connect Authorization Code Flow..."

# Wait for Keycloak to be fully ready
echo "⏳ Waiting for Keycloak to be ready..."
timeout 60 bash -c '
while ! curl -f -s http://localhost:8080/realms/master -H "Host: keycloak.localhost" > /dev/null 2>&1; do
    echo "  Waiting for Keycloak..."
    sleep 2
done'

echo "✅ Keycloak is ready!"

# Get admin password from .env file
source .env 2>/dev/null || echo "Warning: .env file not found"
ADMIN_PASSWORD=${KEYCLOAK_ADMIN_PASSWORD:-"your_secure_admin_password"}

# Get admin access token
echo "🔑 Getting admin access token..."
ADMIN_TOKEN=$(curl -s -X POST \
  "http://localhost:8080/realms/master/protocol/openid-connect/token" \
  -H "Host: keycloak.localhost" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" \
  -d "username=admin" \
  -d "password=$ADMIN_PASSWORD" | \
  jq -r '.access_token' 2>/dev/null || echo "failed")

if [ "$ADMIN_TOKEN" = "failed" ] || [ "$ADMIN_TOKEN" = "null" ]; then
    echo "❌ Failed to get admin token. Check your admin password in .env file"
    exit 1
fi

echo "✅ Got admin access token"

# Check if demo realm exists
echo "🔍 Checking if demo realm exists..."
REALM_EXISTS=$(curl -s -o /dev/null -w "%{http_code}" \
  "http://localhost:8080/admin/realms/demo" \
  -H "Host: keycloak.localhost" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if [ "$REALM_EXISTS" = "200" ]; then
    echo "✅ Demo realm already exists"
else
    echo "📝 Creating demo realm..."
    # Update the realm file for localhost
    sed 's/\${DOMAIN}/localhost/g' keycloak/demo-realm.json > /tmp/demo-realm-localhost.json
    
    # Create the realm
    RESULT=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
      "http://localhost:8080/admin/realms" \
      -H "Host: keycloak.localhost" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      -d @/tmp/demo-realm-localhost.json)
    
    if [ "$RESULT" = "201" ]; then
        echo "✅ Demo realm created successfully!"
    else
        echo "⚠️  Realm creation returned code: $RESULT"
    fi
fi

echo ""
echo "🎉 OpenID Connect Authorization Code Flow Setup Complete!"
echo ""
echo "📋 Configuration Summary:"
echo "  🌐 Authorization Server: http://localhost:8080/realms/demo (Host: keycloak.localhost)"
echo "  📱 Demo Application: http://localhost:8080 (Host: app.localhost)"
echo "  🔐 Client ID: demo-app"
echo "  🔑 Client Secret: demo-app-secret"
echo "  🔄 Flow: Authorization Code Flow"
echo ""
echo "👤 Test User Credentials:"
echo "  Username: demo-user"
echo "  Password: demo123"
echo ""
echo "🔗 OpenID Connect Endpoints:"
echo "  Authorization: http://localhost:8080/realms/demo/protocol/openid-connect/auth"
echo "  Token: http://localhost:8080/realms/demo/protocol/openid-connect/token"
echo "  UserInfo: http://localhost:8080/realms/demo/protocol/openid-connect/userinfo"
echo "  Logout: http://localhost:8080/realms/demo/protocol/openid-connect/logout"
echo ""
echo "📖 To test the Authorization Code Flow:"
echo "  1. Open: http://localhost:8080 (with Host: app.localhost header)"
echo "  2. Click 'Login with Keycloak'"
echo "  3. You'll be redirected to Keycloak login"
echo "  4. Enter demo-user / demo123"
echo "  5. You'll be redirected back with an authorization code"
echo "  6. The app will exchange the code for tokens automatically"
echo ""
echo "🧪 Manual OIDC Flow Test:"
echo "  # 1. Get authorization code (open in browser):"
echo "  http://localhost:8080/realms/demo/protocol/openid-connect/auth?client_id=demo-app&redirect_uri=http://localhost:3000/callback&response_type=code&scope=openid"
echo ""
echo "  # 2. Exchange code for token:"
echo "  curl -X POST http://localhost:8080/realms/demo/protocol/openid-connect/token \\"
echo "    -H 'Host: keycloak.localhost' \\"
echo "    -H 'Content-Type: application/x-www-form-urlencoded' \\"
echo "    -d 'grant_type=authorization_code' \\"
echo "    -d 'client_id=demo-app' \\"
echo "    -d 'client_secret=demo-app-secret' \\"
echo "    -d 'code=YOUR_AUTH_CODE' \\"
echo "    -d 'redirect_uri=http://localhost:3000/callback'"
echo ""

# Clean up temp file
rm -f /tmp/demo-realm-localhost.json

echo "🚀 Ready to test OpenID Connect Authorization Code Flow!"