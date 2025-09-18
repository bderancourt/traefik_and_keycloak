# Traefik + Keycloak HTTPS Setup

A complete containerized setup using Podman Compose with Traefik as reverse proxy, Keycloak as Identity Provider, and a demo Node.js application with OIDC authentication - all running with HTTPS everywhere.

## Architecture

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   Browser       │    │   Traefik    │    │   Keycloak      │
│                 │───▶│  (Port 443)  │───▶│  (Port 8443)    │
│                 │    │   HTTPS      │    │   HTTPS         │
└─────────────────┘    └──────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   Demo App      │
                       │  (Port 3443)    │
                       │   HTTPS         │
                       └─────────────────┘
```

## Features

- **HTTPS Everywhere**: All services communicate over HTTPS with self-signed certificates
- **Single Port Access**: Only port 443 is exposed externally
- **OIDC Authentication**: Complete OAuth 2.0 / OpenID Connect flow
- **Traefik Integration**: Automatic service discovery and routing
- **Keycloak Ready**: Pre-configured realm with demo user
- **Containerized**: Full Podman/Docker Compose setup

## Quick Start

### Prerequisites

- Podman with podman-compose
- Basic understanding of containers and OIDC

### 1. Generate Certificates

First, create the required SSL certificates:

```bash
# See CERTIFICATES.md for detailed instructions
./scripts/generate-certs.sh
```

### 2. Environment Setup

Create a `.env` file:

```bash
KEYCLOAK_DB_PASSWORD=your_secure_db_password
KEYCLOAK_ADMIN_PASSWORD=your_admin_password
KEYCLOAK_CLIENT_SECRET=demo-app-secret
```

### 3. Start Services

```bash
# Start all services
podman-compose up -d

# Check status
podman-compose ps
```

### 4. Access Services

- **Demo App**: https://app.localhost
- **Keycloak Admin**: https://keycloak.localhost/admin
- **Traefik Dashboard**: https://traefik.localhost

### 5. Test Authentication

1. Navigate to https://app.localhost
2. Click "Login with Keycloak"
3. Use credentials: `demo-user` / `demo123`
4. You should be redirected back to the app as authenticated user

## Service Details

### Traefik (Reverse Proxy)
- **URL**: https://traefik.localhost
- **Port**: 443 (HTTPS only)
- **Features**: 
  - Automatic SSL termination
  - Service discovery
  - Load balancing
  - Header manipulation for OIDC

### Keycloak (Identity Provider)
- **URL**: https://keycloak.localhost
- **Admin URL**: https://keycloak.localhost/admin
- **Internal Port**: 8443
- **Features**:
  - Pre-configured `demo` realm
  - OIDC client for demo app
  - Self-signed SSL certificates
  - Database persistence

### Demo Application
- **URL**: https://app.localhost
- **Internal Port**: 3443
- **Features**:
  - Node.js Express application
  - Keycloak OIDC integration
  - Session management
  - Protected routes

## Configuration Files

### Key Components

- `podman-compose.yml` - Main orchestration file
- `traefik/config/dynamic.yml` - Traefik routing and middleware
- `keycloak/demo-realm.json` - Keycloak realm configuration
- `app/server.js` - Demo application with OIDC
- `traefik/certs/` - SSL certificates directory

### Network Architecture

- **web**: Main network for Traefik routing
- **keycloak_internal**: Isolated network for Keycloak-DB communication

## Troubleshooting

### Common Issues

1. **Certificate Errors**: Ensure certificates are generated and properly mounted
2. **Authentication Fails**: Check Keycloak logs and realm configuration
3. **502 Bad Gateway**: Verify all containers are running and healthy
4. **DNS Resolution**: Ensure /etc/hosts entries for *.localhost domains

### Useful Commands

```bash
# View logs
podman-compose logs -f [service_name]

# Restart service
podman-compose restart [service_name]

# Rebuild application
podman-compose build [service_name]

# Check container status
podman ps -a

# Test internal connectivity
podman exec [container] ping [target_container]
```

### Log Locations

- Traefik: `podman logs traefik`
- Keycloak: `podman logs keycloak`
- Demo App: `podman logs demo-app`
- Database: `podman logs keycloak-db`

## Development

### Making Changes

1. **Application Code**: Modify files in `app/`, then rebuild:
   ```bash
   podman-compose build demo-app
   podman-compose restart demo-app
   ```

2. **Traefik Config**: Edit `traefik/config/dynamic.yml`, then restart:
   ```bash
   podman-compose restart traefik
   ```

3. **Keycloak Realm**: Modify `keycloak/demo-realm.json`, then restart:
   ```bash
   podman-compose restart keycloak
   ```

### Adding New Services

1. Add service definition to `podman-compose.yml`
2. Configure Traefik routing in `dynamic.yml`
3. Generate/mount appropriate certificates
4. Add to `web` network for external access

## Security Considerations

⚠️ **This setup uses self-signed certificates and is intended for development/testing only.**

For production use:
- Replace self-signed certificates with proper CA-signed certificates
- Use proper secrets management
- Configure appropriate security headers
- Enable proper logging and monitoring
- Use strong passwords and secrets

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is provided as-is for educational and development purposes.

## Support

For issues and questions:
- Check the troubleshooting section
- Review container logs
- Consult official documentation for Traefik, Keycloak, and Podman