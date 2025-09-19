#!/bin/bash

# SSL Certificate Generation Script for Traefik + Keycloak Setup
# Generates self-signed wildcard certificates for *.localhost domains

set -e

CERT_DIR="traefik/certs"
DOMAIN="localhost"
WILDCARD_DOMAIN="*.${DOMAIN}"
CERT_NAME="localhost"

echo "🔐 Generating SSL certificates for ${WILDCARD_DOMAIN}..."

# Create certificate directory
mkdir -p "${CERT_DIR}"

# Generate private key
echo "📋 Generating private key..."
openssl genrsa -out "${CERT_DIR}/${CERT_NAME}.key" 2048

# Generate certificate signing request (CSR)
echo "📋 Generating certificate signing request..."
openssl req -new -key "${CERT_DIR}/${CERT_NAME}.key" -out "${CERT_DIR}/${CERT_NAME}.csr" -subj "/C=US/ST=State/L=City/O=Organization/OU=OrgUnit/CN=${WILDCARD_DOMAIN}"

# Create extensions file for SAN (Subject Alternative Names)
cat > "${CERT_DIR}/${CERT_NAME}.ext" << EXT
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = ${DOMAIN}
DNS.2 = ${WILDCARD_DOMAIN}
DNS.3 = demo-app
DNS.4 = keycloak
DNS.5 = traefik
IP.1 = 127.0.0.1
EXT

# Generate self-signed certificate
echo "📋 Generating self-signed certificate..."
openssl x509 -req -in "${CERT_DIR}/${CERT_NAME}.csr" -signkey "${CERT_DIR}/${CERT_NAME}.key" -out "${CERT_DIR}/${CERT_NAME}.crt" -days 365 -extfile "${CERT_DIR}/${CERT_NAME}.ext"

# Clean up temporary files
rm "${CERT_DIR}/${CERT_NAME}.csr" "${CERT_DIR}/${CERT_NAME}.ext"

# Set appropriate permissions
chmod 600 "${CERT_DIR}/${CERT_NAME}.key"
chmod 644 "${CERT_DIR}/${CERT_NAME}.crt"

echo "✅ SSL certificates generated successfully!"
echo "📂 Certificate files:"
echo "   Private Key: ${CERT_DIR}/${CERT_NAME}.key"
echo "   Certificate: ${CERT_DIR}/${CERT_NAME}.crt"

# Display certificate information
echo ""
echo "📋 Certificate Information:"
openssl x509 -in "${CERT_DIR}/${CERT_NAME}.crt" -noout -text | grep -E "(Subject|DNS|Not After)"

echo ""
echo "🔧 Next steps:"
echo "1. No hosts file changes needed (using path-based routing)"
echo "2. Start the services: podman-compose up -d"
echo "3. Access services via:"
echo "   - Demo App: https://localhost/app/"
echo "   - Keycloak: https://localhost/keycloak/"
echo "   - Traefik: https://localhost/traefik/"
echo "4. Trust the certificate in your browser (ignore security warnings)"