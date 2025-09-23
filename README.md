# Traefik + Keycloak OIDC Authentication Demo

A complete containerized setup using Podman Compose with Traefik as reverse proxy, Keycloak as Identity Provider, and a demo Node.js application with OIDC authentication. Features automatic HTTPS with self-signed certificates and modern Docker provider configuration.

## Architecture

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   Browser       │    │   Traefik    │    │   Keycloak      │
│                 │───▶│  (Port 443)  │───▶│  (Port 8080)    │
│ HTTPS requests  │    │   HTTPS      │    │   HTTP          │
└─────────────────┘    └──────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   Demo App      │
                       │  (Port 3000)    │
                       │   HTTP          │
                       └─────────────────┘
```

## Features

- **Auto-Generated HTTPS**: Traefik automatically generates self-signed certificates for development
- **TLS Termination**: HTTPS termination at Traefik, internal HTTP communication
- **Docker Provider**: Modern Traefik configuration using container labels (no static config files)
- **Path-Based Routing**: Services accessible via `/keycloak/` and root paths
- **Single-Page Auth**: Simplified authentication flow with single page handling both login and protected content
- **OIDC Authentication**: Complete OAuth 2.0 / OpenID Connect flow with proper ISS validation
- **Proxy-Aware**: X-Forwarded headers ensure proper token validation behind reverse proxy
- **Containerized**: Full Podman/Docker Compose setup with automatic service discovery

## Quick Start

### Prerequisites

- Podman with podman-compose (or Docker with docker-compose)
- No certificate generation required - Traefik handles everything automatically

### 1. Environment Setup

Create a `.env` file:

```bash
KEYCLOAK_DB_PASSWORD=your_secure_db_password
KEYCLOAK_ADMIN_PASSWORD=your_admin_password
KEYCLOAK_CLIENT_SECRET=demo-app-secret
```

### 2. Start Services

```bash
# Start all services
podman-compose up -d

# Check status
podman-compose ps

# View logs (optional)
podman-compose logs -f
```

### 3. Access Services

- **Demo App**: https://localhost/ (single-page auth flow)
- **Keycloak Admin**: https://localhost/keycloak/admin
- **Traefik Dashboard**: https://localhost:8080 (HTTP)

### 4. Test Authentication

1. Navigate to https://localhost/
2. Accept the self-signed certificate warning in your browser
3. Click "🔑 Login with Keycloak" 
4. Use credentials: `demo` / `password`
5. You'll be redirected back to the secured page showing your profile

## Service Details

### Traefik (Reverse Proxy)
- **Dashboard**: http://localhost:8080
- **HTTPS Port**: 443 (with auto-generated self-signed certificates)
- **Configuration**: Container labels (Docker provider)
- **Features**: 
  - Automatic TLS certificate generation
  - Service discovery via Docker API
  - X-Forwarded headers for proxy awareness
  - Path-based routing with priorities

### Keycloak (Identity Provider)
- **URL**: https://localhost/keycloak/
- **Admin URL**: https://localhost/keycloak/admin
- **Internal Port**: 8080 (HTTP)
- **Features**:
  - Pre-configured `demo` realm imported at startup
  - OIDC client for demo app
  - Proxy mode with forwarded headers support
  - Database persistence
  - Modern KC_PROXY_HEADERS configuration

### Demo Application
- **URL**: https://localhost/
- **Internal Port**: 3000 (HTTP)
- **Features**:
  - Single-page authentication flow
  - Node.js Express with keycloak-connect
  - Proxy-aware token validation
  - HTTP request interception for ISS consistency
  - Session management and user profile display

## Configuration Files

### Key Components

- `podman-compose.yml` - Main orchestration with Traefik labels
- `keycloak/demo-realm.json` - Keycloak realm configuration
- `app/server.js` - Demo application with OIDC and proxy awareness
- `app/keycloak.json` - Keycloak adapter configuration

### Modern Architecture

- **No static config files**: Traefik uses Docker provider with container labels
- **Auto-generated TLS**: No certificate management required
- **Internal HTTP**: Services communicate via HTTP internally, HTTPS externally
- **ISS Handling**: Proper token validation with X-Forwarded headers

## Troubleshooting

### Common Issues

1. **Certificate Warnings**: Browser will show self-signed certificate warnings - this is expected for development
2. **Authentication Fails**: Check Keycloak logs: `podman logs keycloak`
3. **502 Bad Gateway**: Verify all containers are running: `podman-compose ps`
4. **ISS Mismatch**: The app handles this automatically with X-Forwarded headers and HTTP request interception

### Useful Commands

```bash
# View logs
podman-compose logs -f [service_name]

# Restart service
podman-compose restart [service_name]

# Rebuild application
podman-compose build demo-app

# Check container status
podman ps -a

# Reset everything (including volumes)
podman-compose down && podman volume prune -f && podman-compose up -d
```

### Debug Steps

```bash
# Check Traefik routes
curl -s http://localhost:8080/api/http/routers | jq

# Test internal connectivity
podman exec demo-app ping keycloak

# View detailed logs
podman logs demo-app --tail 50
podman logs keycloak --tail 50
```

## Technical Details

### Authentication Flow

1. **User visits** `https://localhost/`
2. **App checks** if user has valid Keycloak session
3. **If not authenticated**: Shows login page with "Login with Keycloak" button
4. **User clicks login**: Redirects to `/login` → Keycloak → back to `/` 
5. **If authenticated**: Shows secured content with user profile and logout button

### Proxy Configuration

- **TLS Termination**: Traefik handles HTTPS termination and auto-generates certificates
- **Internal Communication**: All containers communicate via HTTP on internal network
- **ISS Consistency**: App intercepts HTTP requests to Keycloak and adds X-Forwarded headers
- **Token Validation**: Proper ISS validation with proxy awareness

### Modern Features

- **Docker Provider**: No static Traefik config files, everything via container labels
- **Auto-Generated TLS**: Development certificates created automatically by Traefik
- **Single-Page Flow**: Simplified UX with one page handling both login and protected content
- **Proxy-Aware Validation**: Proper token validation behind reverse proxy

## Development

### Making Changes

1. **Application Code**: Modify files in `app/`, then rebuild:
   ```bash
   podman-compose build demo-app
   podman-compose restart demo-app
   ```

2. **Traefik Config**: Configuration is now in container labels in `podman-compose.yml`
   ```bash
   podman-compose up -d  # Apply label changes
   ```

3. **Keycloak Realm**: The realm is imported automatically from `keycloak/demo-realm.json`

### Adding New Services

1. Add service definition to `podman-compose.yml`
2. Add Traefik labels for routing:
   ```yaml
   labels:
     - "traefik.enable=true"
     - "traefik.http.routers.myservice.rule=PathPrefix(`/myservice`)"
     - "traefik.http.services.myservice.loadbalancer.server.port=8080"
   ```
3. Add to `web` network for external access

## Production Considerations

⚠️ **This setup uses auto-generated self-signed certificates and is intended for development/testing only.**

### For Production Use

**Security**:
- Replace auto-generated certificates with proper CA-signed certificates or Let's Encrypt
- Use proper secrets management (HashiCorp Vault, Kubernetes secrets, etc.)
- Configure security headers and HSTS
- Enable proper audit logging and monitoring
- Use strong passwords and rotate secrets regularly

**Infrastructure**:
- Use external PostgreSQL database (Azure Database, AWS RDS, etc.)
- Implement proper backup and disaster recovery
- Configure horizontal scaling for high availability
- Use external load balancer for multi-instance deployments

**Configuration**:
- Set proper Keycloak realm configuration for production domains
- Configure CORS and CSP policies
- Enable rate limiting and DDoS protection
- Use production-grade container orchestration (Kubernetes, etc.)

### Cloud Deployment

This setup can be adapted for cloud deployment:

- **Azure**: Use Azure Container Instances or AKS with Azure Key Vault for certificates
- **AWS**: Deploy on ECS/EKS with ALB and ACM for certificates  
- **Kubernetes**: Use cert-manager for automatic certificate provisioning

## Contributing

1. Fork the repository
2. Create a feature branch
3. Test your changes thoroughly
4. Submit a pull request with clear description

## License

This project is provided as-is for educational and development purposes.