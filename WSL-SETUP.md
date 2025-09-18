# WSL Setup Guide for Traefik + Keycloak

This guide covers the specific steps needed to run the Traefik + Keycloak stack in WSL (Windows Subsystem for Linux).

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

### 3. Install Podman in WSL
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

## 🌐 Network Configuration for WSL

### Access from Windows Host
Your services will be available at:
- `https://localhost:8443` (Keycloak/Apps)
- `https://localhost:8808` (Traefik Dashboard)
- `http://localhost:8080` (HTTP redirect)

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