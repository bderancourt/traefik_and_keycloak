# Traefik + Keycloak OIDC Authentication Demo

A complete containerized setup using Podman Compose with Traefik as reverse proxy, Keycloak as Identity Provider, and a demo Node.js application with OIDC authentication. Features automatic HTTPS with self-signed certificates and modern Docker provider configuration.

> **🚀 Latest Updates**: 
> - ✅ **Ultra-Minimal Configuration**: Only `DOMAIN` variable needed in `.env` file
> - ✅ **Domain Parameterization**: Configurable via single environment variable for easy deployment
> - ✅ **Hardcoded Demo Credentials**: Simplified setup with preconfigured passwords and secrets
> - ✅ **Dynamic Keycloak Config**: Generated at runtime, no static configuration files
> - ✅ **Single-Page Auth Flow**: Streamlined user experience with unified login/protected page
> - ✅ **Production Ready**: Add secrets management for production deployment

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
- **Domain Parameterization**: Configurable via `DOMAIN` environment variable for flexible deployment
- **Dynamic Configuration**: Keycloak adapter config generated at runtime from environment variables
- **Path-Based Routing**: Services accessible via `/keycloak/` and root paths
- **Single-Page Auth**: Simplified authentication flow with single page handling both login and protected content
- **OIDC Authentication**: Complete OAuth 2.0 / OpenID Connect flow with proper ISS validation
- **Proxy-Aware**: X-Forwarded headers ensure proper token validation behind reverse proxy
- **Production Ready**: Zero code changes needed for deployment to different environments
- **Containerized**: Full Podman/Docker Compose setup with automatic service discovery

## Quick Start

### Prerequisites

- Podman with podman-compose (or Docker with docker-compose)
- No certificate generation required - Traefik handles everything automatically

#### Podman Daemon Setup

For podman-compose to work properly, ensure Podman is running in daemon mode:

```bash
# Enable and start Podman socket service (run as regular user, NOT root)
systemctl --user enable podman.socket
systemctl --user start podman.socket

# Verify the socket is running
systemctl --user status podman.socket

# Optional: Check socket path (should show /run/user/$(id -u)/podman/podman.sock)
podman info --format json | jq -r '.host.remoteSocket.path'
```

> **Important**: These commands use `--user` flag and should be run as your **regular user**, NOT as root. The socket will be automatically available at `/run/user/$(id -u)/podman/podman.sock` for the current user. This is required for podman-compose to communicate with the Podman daemon.

### 1. Environment Setup

Create a `.env` file:

```bash
# Domain configuration - replace with your actual domain for production
DOMAIN=localhost
```

> **Note**: This demo uses hardcoded credentials for simplicity:
> - **Keycloak Admin**: `admin` / `admin`
> - **Demo User**: `demo` / `password`  
> - **Client Secret**: `demo-app-secret` (preconfigured in realm)
> 
> For production deployment, change `DOMAIN=localhost` to your actual domain name. All services will automatically use this domain for external URLs.

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

- **Demo App**: https://${DOMAIN}/ (single-page auth flow)
- **Keycloak Admin**: https://${DOMAIN}/keycloak/admin
- **Traefik Dashboard**: http://${DOMAIN}:8080 (HTTP)

> Replace `${DOMAIN}` with your actual domain. For local development with default settings, this will be `localhost`.

### 4. Test Authentication

1. Navigate to https://${DOMAIN}/ (e.g., https://localhost/)
2. Accept the self-signed certificate warning in your browser
3. Click "🔑 Login with Keycloak" 
4. Use credentials: `demo` / `password`
5. You'll be redirected back to the secured page showing your profile

## Service Details

### Traefik (Reverse Proxy)
- **Dashboard**: http://${DOMAIN}:8080 (replace with your domain)
- **HTTPS Port**: 443 (with auto-generated self-signed certificates)
- **Configuration**: Container labels (Docker provider)
- **Features**: 
  - Automatic TLS certificate generation
  - Service discovery via Docker API
  - X-Forwarded headers for proxy awareness
  - Path-based routing with priorities

### Keycloak (Identity Provider)
- **URL**: https://${DOMAIN}/keycloak/ (replace with your domain)
- **Admin URL**: https://${DOMAIN}/keycloak/admin (replace with your domain)
- **Internal Port**: 8080 (HTTP)
- **Features**:
  - **Realm auto-import**: `demo` realm with preconfigured client and user loaded from `demo-realm.json`
  - **Zero manual configuration**: Everything configured via imported realm file
  - **OIDC client preconfigured**: `demo-app` client with secret `demo-app-secret`
  - **Demo user ready**: `demo` / `password` credentials available immediately
  - **Proxy mode**: Forwarded headers support for reverse proxy awareness
  - **Database persistence**: Realm and user data persisted in volume

### Demo Application
- **URL**: https://${DOMAIN}/ (replace with your domain)
- **Internal Port**: 3000 (HTTP)
- **Features**:
  - **Dynamic Keycloak configuration**: Built from environment variables with sensible defaults
  - **Zero hardcoded realm settings**: Uses imported realm configuration automatically
  - **Single-page authentication flow**: Unified login and protected content experience
  - **Proxy-aware token validation**: X-Forwarded headers for proper ISS validation
  - **HTTP request interception**: Internal service communication with external URL consistency
  - **Session management**: Secure session handling with user profile display

## Configuration Files

### Key Components

- `podman-compose.yml` - Main orchestration with Traefik labels and minimal environment variables
- `.env` - Ultra-minimal environment configuration (only `DOMAIN`)
- `keycloak/demo-realm.json` - Complete Keycloak realm configuration with demo user and OIDC client
- `app/server.js` - Demo application with dynamic Keycloak config using sensible defaults
- `app/entrypoint.sh` - Simplified container entrypoint (no custom host resolution)

### Modern Architecture

- **Minimal environment configuration**: Only `DOMAIN` variable needed for deployment
- **Realm-driven configuration**: All Keycloak settings imported from JSON file at startup
- **Dynamic Keycloak config**: Generated at runtime with sensible defaults (realm: demo, client: demo-app)
- **No static config files**: Traefik uses Docker provider with container labels
- **Auto-generated TLS**: No certificate management required
- **Internal HTTP**: Services communicate via HTTP internally, HTTPS externally
- **ISS Handling**: Proper token validation with X-Forwarded headers
- **Zero redundant variables**: Environment only contains what's actually needed

### Environment Configuration

The system uses an ultra-minimal `.env` file for configuration:

```bash
# Domain configuration - change for different environments
DOMAIN=localhost                    # Use your actual domain for production
```

**Demo Credentials (hardcoded for simplicity):**
- **Keycloak Admin**: `admin` / `admin`
- **Demo User**: `demo` / `password`
- **OIDC Client Secret**: `demo-app-secret`

**Key Benefits:**
- **Single variable configuration**: Only domain needs to be changed for deployment
- **Zero secrets management**: Demo uses hardcoded credentials for simplicity  
- **Environment flexibility**: Switch between dev/staging/prod by changing one variable  
- **Dynamic configuration**: Keycloak adapter config generated at runtime
- **Production ready**: Add secrets management for production deployment

**Deployment Examples:**
```bash
# Local development
DOMAIN=localhost

# Staging environment  
DOMAIN=staging.yourdomain.com

# Production (with proper secrets management)
DOMAIN=yourdomain.com
```

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
# Check Traefik routes (replace localhost with your domain)
curl -s http://${DOMAIN}:8080/api/http/routers | jq

# Test internal connectivity
podman exec demo-app ping keycloak

# View detailed logs
podman logs demo-app --tail 50
podman logs keycloak --tail 50
```

## Technical Details

### Authentication Flow

1. **User visits** `https://${DOMAIN}/` (where ${DOMAIN} is your configured domain)
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

2. **Environment Variables**: Update `.env` file for configuration changes:
   ```bash
   # Edit .env file with new values
   nano .env
   
   # Restart affected services to pick up changes
   podman-compose down && podman-compose up -d
   ```

3. **Traefik Config**: Configuration is now in container labels in `podman-compose.yml`
   ```bash
   podman-compose up -d  # Apply label changes
   ```

4. **Domain Changes**: To change domain (dev → staging → production):
   ```bash
   # Update DOMAIN in .env file
   echo "DOMAIN=yourdomain.com" > .env.new
   echo "KEYCLOAK_ADMIN_PASSWORD=your_admin_password" >> .env.new  
   echo "KEYCLOAK_CLIENT_SECRET=your_client_secret" >> .env.new
   mv .env.new .env
   
   # Restart stack with new domain
   podman-compose down && podman-compose up -d
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
- **Externalize hardcoded credentials**: Move admin passwords and client secrets to environment variables or secrets management
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
- Update `DOMAIN` in `.env` to your production domain (e.g., `DOMAIN=yourdomain.com`)
- **Add production credentials** to `.env` or secrets management:
  ```bash
  DOMAIN=yourdomain.com
  KEYCLOAK_ADMIN_PASSWORD=secure_random_password
  KEYCLOAK_CLIENT_SECRET=secure_random_client_secret
  ```
- Update `podman-compose.yml` to use `${KEYCLOAK_ADMIN_PASSWORD}` and `${KEYCLOAK_CLIENT_SECRET}`
- Set proper Keycloak realm configuration for production domains
- Configure CORS and CSP policies
- Enable rate limiting and DDoS protection
- Use production-grade container orchestration (Kubernetes, etc.)

**Environment Variables for Production**:
```bash
# Production .env example
DOMAIN=yourdomain.com
KEYCLOAK_ADMIN_PASSWORD=secure_random_password_here
KEYCLOAK_CLIENT_SECRET=secure_random_secret_here
```

### Cloud Deployment

This setup can be adapted for cloud deployment with minimal changes:

- **Azure**: Use Azure Container Instances or AKS with Azure Key Vault for certificates
  ```bash
  # Azure deployment example
  DOMAIN=myapp.azurecontainer.io
  ```
- **AWS**: Deploy on ECS/EKS with ALB and ACM for certificates  
  ```bash
  # AWS deployment example  
  DOMAIN=myapp.amazonaws.com
  ```
- **Kubernetes**: Use cert-manager for automatic certificate provisioning
  ```bash
  # Kubernetes deployment example
  DOMAIN=myapp.k8s.example.com
  ```

**Key Advantages for Cloud Deployment:**
- ✅ **Single variable change**: Only `DOMAIN` needs updating for new environments
- ✅ **No code modifications**: Application automatically adapts to new domain
- ✅ **Environment parity**: Same codebase works across dev/staging/production
- ✅ **Container-friendly**: All configuration via environment variables

## Contributing

1. Fork the repository
2. Create a feature branch
3. Test your changes thoroughly
4. Submit a pull request with clear description

## License

This project is provided as-is for educational and development purposes.