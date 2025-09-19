# WSL Setup Guide for Traefik + Keycloak HTTPS Stack

This guide covers the specific steps needed to run the HTTPS-only Traefik + Keycloak stack in WSL (Windows Subsystem for Linux).

## 🔧 Prerequisites for WSL

### 1. Ensure WSL2 is Installed
```powershell
# In Windows PowerShell (as Administrator)
wsl --install Ubuntu
wsl --set-default-version 2
wsl --set-version Ubuntu 2
```

### 2. Enable Systemd in WSL2
```bash
# In your WSL Ubuntu terminal
sudo nano /etc/wsl.conf

# Add this content:
[boot]
systemd=true

[network]
generateHosts = false
generateResolvConf = false
```

```powershell
# Restart WSL (in Windows PowerShell)
wsl --shutdown
wsl
```

### 3. Install Podman and Dependencies in WSL
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Podman and dependencies
sudo apt install -y podman slirp4netns fuse-overlayfs uidmap

# Configure for rootless mode
echo "$USER:100000:65536" | sudo tee -a /etc/subuid
echo "$USER:100000:65536" | sudo tee -a /etc/subgid

# Restart user session
podman system migrate
```

### 4. Install Additional Tools
```bash
# Install OpenSSL for certificate generation
sudo apt install -y openssl curl git

# Install podman-compose
pip3 install podman-compose
# or
sudo apt install -y python3-pip
pip3 install --user podman-compose
```

## 🚨 WSL-Specific Issues & Solutions

### Issue 1: Port Conflicts
**Problem**: Windows may already use ports 80, 443, 8080
**Solution**: Modified deployment script uses alternative ports:
- HTTP: 8080 (instead of 80)
- HTTPS: 8443 (instead of 443)  
- Traefik Dashboard: 8808 (instead of 8080)

### Issue 2: Cgroups v2 Not Available
```bash
# Check cgroups version
mount | grep cgroup

# If v1, you might need to enable v2 (requires WSL restart)
# This usually works automatically in newer WSL2 versions
```

### Issue 3: Systemd Not Running
```bash
# Check if systemd is running
systemctl status

# If not working, try rootful mode
sudo podman info
```

### Issue 4: DNS Resolution
```bash
# If DNS issues occur
sudo nano /etc/resolv.conf
# Add: nameserver 8.8.8.8

# Or disable WSL DNS generation (already in wsl.conf above)
```

## 🌐 WSL Network Configuration for HTTPS Stack

### SSL Certificate Trust (Optional)
For development convenience, you can trust the self-signed certificates:

1. After running the certificate generation script, copy the certificate:
   ```bash
   # In WSL
   cp ./traefik/certs/localhost.crt /mnt/c/temp/
   ```

2. In Windows:
   - Double-click the certificate file
   - Install to "Trusted Root Certification Authorities"
   - This eliminates browser security warnings

## 🚀 Quick Start for WSL

### 1. Clone and Setup
```bash
# Clone the repository
git clone <your-repo-url>
cd traefik_and_keycloak

# Generate SSL certificates
chmod +x scripts/generate-certs.sh
./scripts/generate-certs.sh

# Copy environment template
cp .env.example .env
# Edit .env with your passwords
nano .env
```

### 2. Start the HTTPS Stack
```bash
# Start all services
podman-compose up -d

# Check status
podman ps

# View logs if needed
podman-compose logs -f
```

### 3. Access Services
- **Demo App**: https://app.localhost
- **Keycloak Admin**: https://keycloak.localhost  
- **Traefik Dashboard**: https://traefik.localhost

## 🚨 WSL-Specific Troubleshooting

### Issue 1: Port 443 Permission Denied
**Problem**: WSL may not allow binding to port 443
**Solution**: The stack now runs entirely through Traefik on port 443 with proper SSL termination

### Issue 2: Container Communication
**Problem**: Services can't communicate with each other
**Solution**: Ensure all services are on the correct networks:
```bash
# Check networks
podman network ls
podman network inspect traefik_and_keycloak_web
```

### Issue 3: SSL Certificate Issues
**Problem**: Browser shows certificate errors
**Solution**: 
1. Regenerate certificates: `./scripts/generate-certs.sh`
2. Restart services: `podman-compose restart`
3. Clear browser cache/data for localhost domains

### Issue 4: Keycloak Hostname Issues
**Problem**: Keycloak redirects to wrong URLs
**Solution**: Verify the hostname configuration in podman-compose.yml:
```yaml
KC_HOSTNAME: keycloak.localhost
KC_HOSTNAME_STRICT: "false"
```

### Issue 5: Performance Optimization
**Problem**: Slow container startup in WSL
**Solution**: 
```bash
# Increase WSL memory allocation
# Create/edit C:\Users\<username>\.wslconfig
[wsl2]
memory=4GB
processors=2
```

### Issue 6: File Permission Issues
**Problem**: Permission denied on certificate files
**Solution**:
```bash
# Fix permissions
chmod +x scripts/generate-certs.sh
sudo chown -R $USER:$USER traefik/certs/
```

## 🔧 Development Tips for WSL

### 1. Container Management
```bash
# Stop all services
podman-compose down

# Remove all containers and start fresh
podman-compose down -v
podman-compose up -d

# View real-time logs
podman-compose logs -f keycloak
```

### 2. Certificate Management
```bash
# Regenerate certificates if needed
./scripts/generate-certs.sh

# Verify certificate validity
openssl x509 -in traefik/certs/localhost.crt -text -noout
```

### 3. Environment Configuration
```bash
# Quick environment setup with secure passwords
cp .env.example .env
sed -i 's/your_secure_db_password_here/MyDbPassword123/' .env
sed -i 's/your_admin_password_here/MyAdminPassword123/' .env
```

## 📝 Notes for WSL Users

1. **Resource Usage**: WSL2 can consume significant memory. Monitor with `htop` or Windows Task Manager.

2. **Persistence**: Containers and volumes persist across WSL sessions, but not across Windows reboots unless WSL is configured to start automatically.

3. **File System**: Use Linux file system (`~/` or `/home/`) for better performance, not Windows mounted drives (`/mnt/c/`).

4. **Networking**: The HTTPS-only setup ensures all traffic is properly encrypted and routed through Traefik.

5. **Browser Access**: Use `https://app.localhost`, `https://keycloak.localhost`, etc. from your Windows browser - WSL2 automatically forwards these to the Linux containers.

### Port Forwarding (if needed)
```powershell
# In Windows PowerShell (as Administrator)
# If you need external access beyond localhost
netsh interface portproxy add v4tov4 listenport=443 listenaddress=0.0.0.0 connectport=8443 connectaddress=127.0.0.1
netsh interface portproxy add v4tov4 listenport=80 listenaddress=0.0.0.0 connectport=8080 connectaddress=127.0.0.1
```

## 🚀 Deployment in WSL

### Quick Start
```bash
# Clone the repository
git clone <your-repo>
cd traefik_and_keycloak

# For testing in WSL, update domain to localhost
sed -i 's/yourdomain.com/localhost/g' k8s/01-secrets-configmap.yaml
sed -i 's/yourdomain.com/localhost/g' k8s/02-volumes-config.yaml

# Deploy
cd k8s
./deploy.sh
```

### Testing Configuration
For local testing in WSL, you might want to:

1. **Disable Let's Encrypt** (use self-signed certs):
```yaml
# In traefik config, comment out:
# - --certificatesresolvers.letsencrypt.acme.tlschallenge=true
# - --certificatesresolvers.letsencrypt.acme.email=${ACME_EMAIL}
# - --certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json
```

2. **Use HTTP instead of HTTPS** for testing:
```yaml
# In service labels, change:
# - "traefik.http.routers.service.tls=true"
# to:
# - "traefik.http.routers.service.rule=Host(`localhost`)"
```

## 🔍 Troubleshooting WSL Issues

### Check Podman Status
```bash
# Test basic functionality
podman version
podman info

# Check if rootless works
podman run --rm hello-world

# If issues, try rootful
sudo podman run --rm hello-world
```

### Memory and Resource Limits
```bash
# WSL has default memory limits, check with:
free -h

# If needed, configure WSL memory in Windows:
# Create/edit: %USERPROFILE%\.wslconfig
```

### Container Networking
```bash
# Test internal networking
podman network ls
podman network inspect podman

# Check if containers can reach each other
podman exec keycloak ping keycloak-db
```

### Common Error Solutions

**Error: "cannot find newuidmap"**
```bash
sudo apt install uidmap
```

**Error: "cgroups v2 required"**
```bash
# Usually resolved by ensuring WSL2 + systemd
# Check: cat /proc/version
```

**Error: "port already in use"**
```bash
# Check what's using the port
sudo netstat -tulpn | grep :80
# Kill process or use different ports
```

## 📝 Performance Tips for WSL

1. **Keep files in Linux filesystem** (`/home/user/` not `/mnt/c/`)
2. **Use WSL2** (not WSL1)
3. **Allocate enough memory** to WSL
4. **Use rootless mode** when possible (better security)
5. **Enable systemd** for full compatibility

## 🔄 Regular Maintenance

```bash
# Clean up unused containers/images
podman system prune -f

# Check resource usage
podman stats

# Restart WSL if issues persist
# (In Windows PowerShell): wsl --shutdown && wsl
```

This should help you run the stack successfully in your WSL environment!