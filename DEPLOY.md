# Deployment Guide — DigitalOcean VPS

This guide walks you through deploying the full **Leather-Inventory** stack (Node.js API + React frontend + MongoDB) to a DigitalOcean droplet.

---

## Architecture

```
Internet
    |
    v
+----------------------------+
|  Nginx (port 80 / 443)     |
|  - Serves static React app |
|  - Proxies /api/* to Node  |
+----------------------------+
    |              |
    v              v
+---------+  +------------------+
|  React  |  |  Node.js API     |
|  dist/  |  |  (PM2 managed)   |
+---------+  +------------------+
                      |
                      v
               +-------------+
               |  MongoDB    |
               |  (Atlas or  |
               |   Docker)   |
               +-------------+
```

---

## 1. Prerequisites

- A **DigitalOcean account** (sign up at [digitalocean.com](https://digitalocean.com))
- A **domain name** (e.g., from Namecheap, Cloudflare, or GoDaddy)
- SSH key added to your DigitalOcean account

---

## 2. Create the Droplet

1. Log in to DigitalOcean → **Create → Droplets**
2. **Choose Region**: Pick one closest to your users (e.g., `NYC1`, `FRA1`, `BLR1`)
3. **Choose an Image**: `Ubuntu 24.04 (LTS) x64`
4. **Choose Size**: 
   - Minimum: **Basic / $6/mo** (1 GB RAM / 1 CPU) for testing
   - Recommended: **Basic / $12/mo** (2 GB RAM / 1 CPU) for production
5. **Choose Authentication**: SSH key (recommended) or password
6. **Hostname**: `inventory-app` (or your domain)
7. Click **Create Droplet**

Wait ~1 minute, then copy the **IPv4 address** (e.g., `192.0.2.1`).

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

### 4.2 Install Node.js (via NodeSource)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Verify:

```bash
node -v   # v20.x.x
npm -v    # 10.x.x
```

### 4.3 Install Nginx

```bash
sudo apt update
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 4.4 Install PM2 (process manager)

```bash
sudo npm install -g pm2
```

### 4.5 Install Git

```bash
sudo apt install -y git
```

---

## 5. MongoDB Setup (Recommended: Atlas)

For production, **MongoDB Atlas** (managed cloud DB) is simpler and more reliable than self-hosting.

### Option A: MongoDB Atlas (Easiest)

1. Go to [mongodb.com/atlas](https://mongodb.com/atlas) → Sign up
2. Create a **Free (M0)** cluster
3. In **Network Access** → Add your droplet IP to the allowlist
4. In **Database Access** → Create a user with password
5. Go to **Clusters → Connect → Drivers → Node.js**
6. Copy the connection string:

```
mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/inventory_db?retryWrites=true&w=majority
```

Save this — you'll need it for the backend `.env`.

### Option B: Self-Hosted MongoDB (Docker)

If you prefer to run MongoDB on the same VPS:

```bash
sudo apt install -y docker.io docker-compose
sudo systemctl enable docker

# Create a docker-compose for MongoDB
mkdir -p ~/mongodb && cd ~/mongodb
cat > docker-compose.yml << 'EOF'
version: "3.8"
services:
  mongo:
    image: mongo:latest
    restart: unless-stopped
    ports:
      - "127.0.0.1:27017:27017"
    volumes:
      - mongo-data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: YOUR_STRONG_PASSWORD
volumes:
  mongo-data:
EOF

sudo docker compose up -d
```

Connection string for self-hosted:

```
mongodb://admin:YOUR_STRONG_PASSWORD@localhost:27017/inventory_db?authSource=admin
```

---

## 6. Deploy the Application

### 6.1 Clone the repo on the server

```bash
cd ~
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git inventory-app
cd inventory-app
```

### 6.2 Build the Frontend

```bash
cd app
npm install
npm run build
```

This creates the `app/dist/` folder with static files.

### 6.3 Configure Backend Environment

```bash
cd ~/inventory-app/api
mkdir -p logs
```

Create the production `.env`:

```bash
nano .env
```

Paste (replace values with yours):

```env
PORT=3000
MONGO_URI=mongodb+srv://your_user:your_password@cluster0.xxxxx.mongodb.net/inventory_db?retryWrites=true&w=majority
JWT_SECRET=REPLACE_THIS_WITH_A_LONG_RANDOM_STRING_MIN_32_CHARS
JWT_EXPIRES_IN=1d
```

> **Generate a strong JWT secret:**
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

### 6.4 Install Backend Dependencies

```bash
cd ~/inventory-app/api
npm install --production
```

### 6.5 Start the API with PM2

```bash
cd ~/inventory-app/api
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd
```

The last command will output something like:

```bash
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u deployer --hp /home/deployer
```

**Run that exact command with `sudo`** to make PM2 auto-start on boot.

Verify the API is running:

```bash
curl http://localhost:3000/users
# Should return: {"message":"Unauthorized"}
```

---

## 7. Configure Nginx

### 7.1 Create the site config

```bash
sudo nano /etc/nginx/sites-available/inventory
```

Paste this (replace `yourdomain.com`):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend — static React build
    location / {
        root /home/deployer/inventory-app/app/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API — proxy to Node.js
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API — other routes (users, sales, products, etc.)
    location ~ ^/(users|sales|products|goodIns|stores|transfers|api)/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 7.2 Enable the site

```bash
sudo ln -sf /etc/nginx/sites-available/inventory /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 7.3 Fix permissions

Nginx runs as `www-data` and needs access to the static files:

```bash
sudo chown -R deployer:www-data /home/deployer/inventory-app/app/dist
sudo chmod -R 755 /home/deployer/inventory-app/app/dist
```

---

## 8. SSL with Let's Encrypt (HTTPS)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts. Choose **Redirect HTTP to HTTPS** when asked.

Certbot auto-renews. Test renewal:

```bash
sudo certbot renew --dry-run
```

---

## 9. Verify Everything

Open `https://yourdomain.com` in your browser. You should see the login page.

Test the API:

```bash
curl -i https://yourdomain.com/users
# HTTP/2 401
# {"message":"Unauthorized"}
```

Test the frontend build:

```bash
curl -i https://yourdomain.com/
# Should return the React index.html
```

---

## 10. Updating After Code Changes

When you push new code, SSH to the server and run:

```bash
cd ~/inventory-app
git pull origin main

# Rebuild frontend
cd app && npm install && npm run build && cd ..

# Restart backend
pm2 restart inventory-api

# Reload nginx (if configs changed)
sudo nginx -t && sudo systemctl reload nginx
```

---

## 11. Monitoring & Logs

### PM2 status

```bash
pm2 status
pm2 logs inventory-api
pm2 monit
```

### Nginx logs

```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Backend logs

```bash
tail -f ~/inventory-app/api/logs/out.log
tail -f ~/inventory-app/api/logs/err.log
```

### Server resources

```bash
htop
free -h
df -h
```

---

## 12. Firewall (UFW)

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

---

## 13. Backup Strategy (Recommended)

For MongoDB Atlas, enable **Automated Backups** in the Atlas dashboard.

For self-hosted MongoDB, add a daily cron job:

```bash
sudo apt install -y cron

crontab -e
```

Add:

```cron
0 3 * * * /usr/bin/mongodump --uri="mongodb://admin:PASSWORD@localhost:27017/inventory_db?authSource=admin" --out=/home/deployer/backups/$(date +\%Y-\%m-\%d) && find /home/deployer/backups -type d -mtime +7 -exec rm -rf {} +
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `502 Bad Gateway` | API is not running: `pm2 status` → `pm2 restart inventory-api` |
| Blank white page | Check `app/dist/` exists and Nginx `root` path is correct |
| CORS errors | Backend `cors()` is open, but check `VITE_API_URL` points to `/api` (same domain) |
| MongoDB connection timeout | Check Atlas IP allowlist or self-hosted MongoDB is running |
| Permission denied on files | Run `sudo chown -R deployer:www-data /home/deployer/inventory-app` |
| Port 3000 exposed publicly | It's OK — Nginx proxies to it. But you can firewall it: `sudo ufw deny 3000` |

---

## Quick Reference Commands

```bash
# SSH
ssh root@YOUR_DROPLET_IP

# Backend
pm2 status
pm2 restart inventory-api
pm2 logs inventory-api --lines 50

# Frontend rebuild
cd ~/inventory-app/app && npm run build

# Nginx
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl status nginx

# Full update
cd ~/inventory-app && git pull && cd app && npm run build && cd ../api && pm2 restart inventory-api
```

---

## Estimated Monthly Cost

| Service | Cost |
|---------|------|
| DigitalOcean Droplet (2 GB RAM) | ~$12/mo |
| MongoDB Atlas (M0 Free Tier) | Free |
| Domain name | ~$10–15/year |
| **Total** | **~$12/mo** |

---

**You're done!** Your app should be live at `https://yourdomain.com`.
