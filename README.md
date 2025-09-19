# Traefik + Keycloak HTTPS Setup with Path-Based Routing

A complete containerized setup using Podman Compose with Traefik as reverse proxy, Keycloak as Identity Provider, and a demo Node.js application with OIDC authentication - all running with HTTPS everywhere and path-based routing for Azure deployment compatibility.

## Architecture

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   Browser       │    │   Traefik    │    │   Keycloak      │
│                 │───▶│  (Port 443)  │───▶│  (Port 8443)    │
│ Path-based URLs │    │   HTTPS      │    │   HTTPS         │
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
- **Path-Based Routing**: All services accessible under different paths (no subdomains required)
- **Azure Deployment Ready**: Compatible with Azure Container Instances and App Service constraints
- **Single Port Access**: Only port 443 is exposed externally
- **OIDC Authentication**: Complete OAuth 2.0 / OpenID Connect flow with correct redirect URIs
- **Traefik Integration**: Automatic service discovery and routing with API access for dashboard
- **Keycloak Ready**: Pre-configured realm with demo user and path-based redirect URIs
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

- **Demo App**: https://localhost/app/
- **Keycloak Admin**: https://localhost/keycloak/admin
- **Traefik Dashboard**: https://localhost/traefik/

### 5. Test Authentication

1. Navigate to https://localhost/app/
2. Click "Login with Keycloak"
3. Use credentials: `demo` / `password`
4. You should be redirected back to the app as authenticated user

## Service Details

### Traefik (Reverse Proxy)
- **URL**: https://localhost/traefik/
- **Port**: 443 (HTTPS only)
- **Features**: 
  - Automatic SSL termination
  - Service discovery
  - Load balancing
  - Header manipulation for OIDC
  - Path-based routing

### Keycloak (Identity Provider)
- **URL**: https://localhost/keycloak/
- **Admin URL**: https://localhost/keycloak/admin
- **Internal Port**: 8443
- **Features**:
  - Pre-configured `demo` realm
  - OIDC client for demo app
  - Self-signed SSL certificates
  - Database persistence
  - Path-based access

### Demo Application
- **URL**: https://localhost/app/
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
4. **DNS Resolution**: Ensure localhost resolves correctly (path-based routing eliminates subdomain requirements)

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

## Azure Deployment Readiness

This setup is specifically designed for Azure deployment compatibility:

### Path-Based Routing Benefits
- **No subdomain requirements**: Works with single hostname constraints
- **Azure Container Instances compatible**: Single port exposure (443)
- **Azure App Service ready**: Path-based routing works within App Service constraints
- **Load balancer friendly**: All traffic flows through single entry point

### Azure Migration Considerations
- Replace self-signed certificates with Azure Key Vault certificates
- Use Azure Database for PostgreSQL instead of containerized database
- Configure Azure Container Registry for image storage
- Set up Azure Application Gateway for production load balancing
- Use Azure Active Directory for production identity management

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