# Deployment Guide — DigitalOcean VPS (Docker Compose)

This guide walks you through deploying the full **Leather-Inventory** stack to a DigitalOcean droplet using **Docker Compose**. The backend, frontend, and MongoDB all run in containers. A system-level Nginx + Let's Encrypt handles HTTPS.

---

## Architecture

```
Internet
    |
    v
+-----------------------------+
|  System Nginx (80 / 443)    |  ← Let's Encrypt SSL
|  - Proxies everything to    |
|    Docker nginx on port 80  |
+-----------------------------+
    |
    v
+-----------------------------+
|  Docker Compose Network     |
|                             |
|  +---------------------+    |
|  | nginx (container)   |    |  ← Serves React static files
|  | Port 80 (internal)  |    |  ← Proxies /api/* to backend
|  +---------------------+    |
|           |                 |
|           v                 |
|  +---------------------+    |
|  | backend (container) |    |  ← Node.js API
|  | Port 3000 (internal)|    |
|  +---------------------+    |
|           |                 |
|           v                 |
|  +---------------------+    |
|  | mongo (container)   |    |  ← MongoDB 6
|  | Port 27017 (internal)|   |
|  +---------------------+    |
+-----------------------------+
```

**Why system Nginx + Docker Nginx?**
- System Nginx terminates SSL (port 443) and manages Let's Encrypt certificates
- Docker Nginx serves the built React app and routes API calls to the backend
- This keeps SSL concerns outside your application containers

---

## 1. Prerequisites

- A **DigitalOcean account** (sign up at [digitalocean.com](https://digitalocean.com))
- A **domain name** (e.g., from Namecheap, Cloudflare, or GoDaddy)
- SSH key added to your DigitalOcean account

---

## 2. Create the Droplet

1. Log in to DigitalOcean → **Create → Droplets**
2. **Choose Region**: Pick one closest to your users (e.g., `NYC1`, `FRA1`, `BLR1`, `LON1`)
3. **Choose an Image**: `Ubuntu 24.04 (LTS) x64`
4. **Choose Size**:
   - Minimum: **Basic / $12/mo** (2 GB RAM / 1 CPU) — required for Docker
   - Recommended: **Basic / $18/mo** (2 GB RAM / 2 CPU) for smoother builds
5. **Choose Authentication**: SSH key (recommended)
6. **Hostname**: `inventory-app` (or your domain)
7. Click **Create Droplet**

Wait ~1 minute, then copy the **IPv4 address**.

---

## 3. Point Your Domain to the Server

In your domain registrar/DNS provider, create an **A record**:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | `@` | `YOUR_DROPLET_IP` | Auto |
| A | `www` | `YOUR_DROPLET_IP` | Auto |

Wait 5–30 minutes for DNS propagation. Test with:

```bash
ping yourdomain.com
```

---

## 4. Initial Server Setup

SSH into your server (replace with your actual IP):

```bash
ssh root@YOUR_DROPLET_IP
```

### 4.1 Create a non-root user

```bash
adduser deployer
usermod -aG sudo deployer
su - deployer
```

### 4.2 Update system packages

```bash
sudo apt update && sudo aept upgrade -y
```

### 4.3 Install Docker & Docker Compose

```bash
# Install Docker
sudo apt install -y apt-transport-https ca-certificates curl gnupg lsb-release

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add deployer to docker group (run Docker without sudo)
sudo usermod -aG docker deployer
newgrp docker

# Verify
docker --version
docker compose version
```

### 4.4 Install system Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 4.5 Install Git

```bash
sudo apt install -y git
```

---

## 5. Deploy the Application

### 5.1 Clone the repo on the server

```bash
cd ~
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git inventory-app
cd inventory-app
```

### 5.2 Create the production environment file

```bash
cp .env.example .env
nano .env
```

Paste and edit (generate a strong secret):

```env
JWT_SECRET=REPLACE_THIS_WITH_A_LONG_RANDOM_STRING
JWT_EXPIRES_IN=1d
CORS_ORIGIN=https://yourdomain.com
```

> **Generate a strong JWT secret:**
> ```bash
> openssl rand -base64 32
> ```

### 5.3 Build and start the containers (production)

```bash
cd ~/inventory-app
docker compose -f docker-compose.prod.yml up --build -d
```

This builds:
- Backend image (`api/Dockerfile`)
- Frontend build inside nginx image (`nginx/Dockerfile`)
- Pulls MongoDB 6 image

### 5.4 Verify containers are running

```bash
docker compose -f docker-compose.prod.yml ps
```

You should see:
- `inventory-backend` — Up
- `inventory-nginx` — Up, port 80 mapped
- `inventory-mongo` — Up (healthy)

### 5.5 Seed the default admin user

```bash
docker exec -e MONGO_URI=mongodb://mongo:27017/inventory_db inventory-backend node seed-admin.js
```

Expected output:
```
Admin account created successfully!
  Email: admin@gmail.com
  Password: admin12345
```

> **Change this password immediately after first login.**

### 5.6 Verify the API is responding

```bash
curl http://localhost/health
# {"status":"ok","db":"connected"}

curl -i http://localhost/users
# HTTP/1.1 401 Unauthorized
```

The 401 on `/users` is correct — it means auth is working.

---

## 6. Configure System Nginx + Let's Encrypt (HTTPS)

### 6.1 Create the Nginx site config

```bash
sudo nano /etc/nginx/sites-available/inventory
```

Paste this (replace `yourdomain.com`):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 6.2 Enable the site

```bash
sudo ln -sf /etc/nginx/sites-available/inventory /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 6.3 Install SSL with Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts. Choose **Redirect HTTP to HTTPS** when asked.

Certbot auto-renews. Test renewal:

```bash
sudo certbot renew --dry-run
```

### 6.4 Verify HTTPS

Open `https://yourdomain.com` in your browser. You should see the login page with a valid SSL certificate.

Test the API over HTTPS:

```bash
curl -i https://yourdomain.com/users
# HTTP/2 401
# {"message":"Unauthorized"}
```

---

## 7. Updating After Code Changes

When you push new code, SSH to the server and run:

```bash
cd ~/inventory-app
git pull origin main

# Rebuild everything and restart
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up --build -d

# Verify
docker compose -f docker-compose.prod.yml ps
```

> **Tip:** To avoid downtime during updates, use `docker compose -f docker-compose.prod.yml up --build -d` without `down` first. Docker will recreate only changed containers.

---

## 8. Monitoring & Logs

### Docker status

```bash
docker ps
docker stats
```

### Container logs

```bash
# Backend
docker logs -f inventory-backend

# Nginx (application)
docker logs -f inventory-nginx

# MongoDB
docker logs -f inventory-mongo
```

### System Nginx logs

```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Server resources

```bash
htop
free -h
df -h
docker system df
```

---

## 9. Backup Strategy

### Automated daily MongoDB backup

Create a backup script:

```bash
mkdir -p ~/backups
nano ~/backup-mongo.sh
```

Paste:

```bash
#!/bin/bash
BACKUP_DIR="/home/deployer/backups"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
CONTAINER="inventory-mongo"
DB_NAME="inventory_db"

mkdir -p "$BACKUP_DIR"

docker exec "$CONTAINER" mongodump --db "$DB_NAME" --archive > "$BACKUP_DIR/${DB_NAME}_${DATE}.archive"

# Keep only last 7 backups
find "$BACKUP_DIR" -name "*.archive" -type f -mtime +7 -delete

echo "Backup completed: ${DB_NAME}_${DATE}.archive"
```

Make it executable and add to cron:

```bash
chmod +x ~/backup-mongo.sh

# Add cron job (runs daily at 3 AM)
(crontab -l 2>/dev/null; echo "0 3 * * * /home/deployer/backup-mongo.sh >> /home/deployer/backups/backup.log 2>&1") | crontab -
```

### Restore from backup

```bash
# Replace with your backup file
docker exec -i inventory-mongo mongorestore --db inventory_db --archive < ~/backups/inventory_db_YYYY-MM-DD_HH-MM-SS.archive
```

---

## 10. Firewall (UFW)

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

Verify:

```bash
sudo ufw status
```

You should see:
```
To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
Nginx Full                 ALLOW       Anywhere
```

> **Important:** Do NOT open port 3000 (backend) or 27017 (MongoDB). They are only accessible inside the Docker network.

---

## 11. Troubleshooting

| Problem | Fix |
|---------|-----|
| `502 Bad Gateway` | Docker nginx is not running: `docker ps` → `docker compose -f docker-compose.prod.yml restart nginx` |
| Container keeps restarting | Check logs: `docker logs inventory-backend` — likely `JWT_SECRET` missing |
| Blank white page | Frontend build failed during `docker compose -f docker-compose.prod.yml up --build`. Check: `docker compose -f docker-compose.prod.yml logs nginx` |
| CORS errors | Check `CORS_ORIGIN` in `.env` matches your domain. Rebuild: `docker compose -f docker-compose.prod.yml up --build -d` |
| MongoDB connection timeout | Check `inventory-mongo` is healthy: `docker ps`. Verify `MONGO_URI` in docker-compose |
| Permission denied on files | Make sure you're running commands as `deployer`, not root |
| SSL certificate error | Run `sudo certbot renew --dry-run`. Check system nginx config: `sudo nginx -t` |
| Disk full | Clean up Docker: `docker system prune -a` and `docker volume prune` |

---

## 12. Security Checklist

Before going live, verify:

- [ ] `JWT_SECRET` is set to a long random string in `.env`
- [ ] `CORS_ORIGIN` is set to your domain (not empty) in `.env`
- [ ] MongoDB port `27017` is NOT exposed to the host (check `docker-compose.yml`)
- [ ] Backend port `3000` is NOT exposed to the host
- [ ] UFW firewall is enabled and only allows SSH + Nginx
- [ ] Default admin password has been changed
- [ ] `api/.env` and `app/.env` are NOT committed to Git
- [ ] Backups are running and restorable
- [ ] SSL certificate is valid and auto-renewing

---

## 13. Quick Reference Commands

```bash
# SSH
ssh deployer@YOUR_DROPLET_IP

# Docker Compose (production)
cd ~/inventory-app
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f
docker compose -f docker-compose.prod.yml up --build -d
docker compose -f docker-compose.prod.yml down

# Backend logs
docker compose -f docker-compose.prod.yml logs -f backend --tail 50

# Nginx (system)
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl status nginx

# Full update
cd ~/inventory-app && git pull && docker compose -f docker-compose.prod.yml down && docker compose -f docker-compose.prod.yml up --build -d

# Backup
~/backup-mongo.sh
```

---

## 14. Estimated Monthly Cost

| Service | Cost |
|---------|------|
| DigitalOcean Droplet (2 GB RAM) | ~$12/mo |
| Domain name | ~$10–15/year |
| Let's Encrypt SSL | Free |
| **Total** | **~$12/mo** |

---

## Architecture Notes

**Why not use PM2 anymore?**
- Docker handles process management, restarts, and isolation
- No need to install Node.js on the host
- Frontend is built inside the container, not on the host
- Updates are a single `docker compose -f docker-compose.prod.yml up --build -d` command

**Why system Nginx instead of Traefik or Docker-only nginx?**
- Let's Encrypt integration with certbot is simplest with system Nginx
- Separation of concerns: SSL termination lives on the host, application lives in Docker
- Easier to debug and inspect SSL configs

---

**You're done!** Your app should be live at `https://yourdomain.com`.
