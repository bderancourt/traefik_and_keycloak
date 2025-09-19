# SSL Certificate Generation Guide

This guide explains how to generate self-signed SSL certificates for the Traefik + Keycloak setup. These certificates are used for HTTPS communication between all services.

## Overview

The setup requires SSL certificates for:
- **Wildcard Certificate**: `*.localhost` for all services
- **Traefik**: HTTPS termination on port 443
- **Keycloak**: Internal HTTPS communication on port 8443
- **Demo App**: Internal HTTPS communication on port 3443

## Method 1: Automated Script (Recommended)

### Create Certificate Generation Script

Create the script directory and the generation script:

```bash
# Create scripts directory
mkdir -p scripts

# Create the certificate generation script
cat > scripts/generate-certs.sh << 'EOF'
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
DNS.3 = app.${DOMAIN}
DNS.4 = keycloak.${DOMAIN}
DNS.5 = traefik.${DOMAIN}
DNS.6 = demo-app
DNS.7 = keycloak
DNS.8 = traefik
EXT

# Generate self-signed certificate
echo "📋 Generating self-signed certificate..."
openssl x509 -req -in "${CERT_DIR}/${CERT_NAME}.csr" -signkey "${CERT_DIR}/${CERT_NAME}.key" -out "${CERT_DIR}/${CERT_NAME}.crt" -days 365 -extensions v3_req -extfile "${CERT_DIR}/${CERT_NAME}.ext"

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

EOF

# Make the script executable
chmod +x scripts/generate-certs.sh
```

### Run the Script

```bash
# Generate certificates
./scripts/generate-certs.sh
```

## Method 2: Manual Generation

### Step 1: Create Certificate Directory

```bash
mkdir -p traefik/certs
cd traefik/certs
```

### Step 2: Generate Private Key

```bash
openssl genrsa -out localhost.key 2048
```

### Step 3: Create Certificate Configuration

Create a configuration file for the certificate:

```bash
cat > localhost.conf << EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = US
ST = State
L = City
O = Organization
OU = Organizational Unit
CN = *.localhost

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
DNS.3 = app.localhost
DNS.4 = keycloak.localhost
DNS.5 = traefik.localhost
DNS.6 = demo-app
DNS.7 = keycloak
DNS.8 = traefik
EOF
```

### Step 4: Generate Certificate

```bash
openssl req -new -x509 -key localhost.key -out localhost.crt -days 365 -config localhost.conf -extensions v3_req
```

### Step 5: Clean Up

```bash
rm localhost.conf
```

### Step 6: Set Permissions

```bash
chmod 600 localhost.key
chmod 644 localhost.crt
```

## Method 3: Using OpenSSL with Custom CA

For a more realistic setup, you can create your own Certificate Authority:

### Step 1: Create CA Private Key

```bash
mkdir -p traefik/certs/ca
cd traefik/certs/ca

# Generate CA private key
openssl genrsa -out ca.key 4096
```

### Step 2: Create CA Certificate

```bash
openssl req -new -x509 -key ca.key -sha256 -subj "/C=US/ST=State/L=City/O=LocalCA/CN=Local Development CA" -days 3650 -out ca.crt
```

### Step 3: Generate Server Private Key

```bash
cd ..
openssl genrsa -out localhost.key 2048
```

### Step 4: Create Certificate Signing Request

```bash
openssl req -new -key localhost.key -out localhost.csr -subj "/C=US/ST=State/L=City/O=Organization/CN=*.localhost"
```

### Step 5: Create Certificate Extensions

```bash
cat > localhost.ext << EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
DNS.3 = app.localhost
DNS.4 = keycloak.localhost
DNS.5 = traefik.localhost
DNS.6 = demo-app
DNS.7 = keycloak
DNS.8 = traefik
EOF
```

### Step 6: Sign Certificate with CA

```bash
openssl x509 -req -in localhost.csr -CA ca/ca.crt -CAkey ca/ca.key -CAcreateserial -out localhost.crt -days 365 -extensions v3_req -extfile localhost.ext
```

### Step 7: Clean Up

```bash
rm localhost.csr localhost.ext
```

## Verification

### Check Certificate Details

```bash
# View certificate information
openssl x509 -in traefik/certs/localhost.crt -noout -text

# Check certificate expiration
openssl x509 -in traefik/certs/localhost.crt -noout -dates

# Verify certificate against private key
openssl x509 -noout -modulus -in traefik/certs/localhost.crt | openssl md5
openssl rsa -noout -modulus -in traefik/certs/localhost.key | openssl md5
# The MD5 hashes should match
```

### Test Certificate

```bash
# Test with OpenSSL s_client (after services are running)
echo "GET /" | openssl s_client -connect app.localhost:443 -verify_return_error
```

## Browser Configuration

Since these are self-signed certificates, browsers will show security warnings. For development:

### Chrome/Chromium
1. Navigate to the site
2. Click "Advanced" on the security warning
3. Click "Proceed to site (unsafe)"
4. Or add `--ignore-certificate-errors` flag when launching Chrome

### Firefox
1. Navigate to the site
2. Click "Advanced"
3. Click "Accept the Risk and Continue"

### System-wide Trust (Optional)

To trust the certificates system-wide on Linux:

```bash
# Copy CA certificate to system trust store
sudo cp traefik/certs/ca/ca.crt /usr/local/share/ca-certificates/local-dev-ca.crt

# Update certificate store
sudo update-ca-certificates
```

## Environment Configuration

### hosts File

Add these entries to `/etc/hosts`:

```bash
# Add to /etc/hosts
127.0.0.1 app.localhost
127.0.0.1 keycloak.localhost
127.0.0.1 traefik.localhost
```

### Environment Variables

Create `.env` file with certificate paths:

```bash
# SSL Certificate Configuration
SSL_CERT_PATH=./traefik/certs/localhost.crt
SSL_KEY_PATH=./traefik/certs/localhost.key

# Other environment variables
KEYCLOAK_DB_PASSWORD=your_secure_db_password
KEYCLOAK_ADMIN_PASSWORD=your_admin_password
KEYCLOAK_CLIENT_SECRET=demo-app-secret
```

## Production Considerations

⚠️ **These self-signed certificates are for development only!**

For production environments:

1. **Use a proper Certificate Authority** (Let's Encrypt, commercial CA)
2. **Implement certificate rotation**
3. **Use proper DNS names** (not .localhost)
4. **Store private keys securely**
5. **Monitor certificate expiration**

### Let's Encrypt Integration

For production with real domains, modify the Traefik configuration to use Let's Encrypt:

```yaml
# traefik/config/dynamic.yml
certificatesResolvers:
  letsencrypt:
    acme:
      email: your-email@example.com
      storage: /letsencrypt/acme.json
      httpChallenge:
        entryPoint: web
```

## Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure private key has correct permissions (600)
2. **Certificate Not Found**: Verify file paths in configuration
3. **SAN Mismatch**: Ensure all required domains are in Subject Alternative Names
4. **Expired Certificate**: Check expiration date and regenerate if needed

### Debug Commands

```bash
# Check file permissions
ls -la traefik/certs/

# Verify certificate chain
openssl verify -CAfile traefik/certs/ca/ca.crt traefik/certs/localhost.crt

# Check certificate against domain
openssl s_client -connect keycloak.localhost:443 -servername keycloak.localhost
```

## Automation

### Renewal Script

Create a renewal script for production:

```bash
#!/bin/bash
# renewal.sh

CERT_DIR="traefik/certs"
DAYS_UNTIL_EXPIRY=$(openssl x509 -in "${CERT_DIR}/localhost.crt" -noout -checkend $((30*24*3600)))

if [ $? -ne 0 ]; then
    echo "Certificate expires within 30 days, renewing..."
    ./scripts/generate-certs.sh
    podman-compose restart traefik keycloak demo-app
fi
```

### Cron Job

Add to crontab for automatic renewal:

```bash
# Check certificate expiry weekly
0 0 * * 0 /path/to/your/project/renewal.sh
```

## Security Best Practices

1. **Secure Private Keys**: Store with minimal permissions (600)
2. **Regular Rotation**: Replace certificates before expiration
3. **Monitor Expiry**: Set up alerts for certificate expiration
4. **Backup Certificates**: Include in backup strategy
5. **Access Control**: Limit access to certificate files
6. **Audit Trail**: Log certificate generation and usage

---

For questions or issues with certificate generation, refer to the main project documentation or check the troubleshooting section in README.md.