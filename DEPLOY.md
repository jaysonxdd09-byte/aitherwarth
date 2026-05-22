# VPS Deployment Guide

## First Time Setup on VPS (Ubuntu/Debian)

### 1. Install Node.js, Git, pm2
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git nginx unzip
sudo npm install -g pm2
```

### 2. Clone the project
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git /var/www/aitherwarth
cd /var/www/aitherwarth
npm install
```

### 3. Download PocketBase for Linux
```bash
mkdir -p pocketbase
wget https://github.com/pocketbase/pocketbase/releases/download/v0.27.1/pocketbase_0.27.1_linux_amd64.zip
unzip pocketbase_0.27.1_linux_amd64.zip -d pocketbase/
chmod +x pocketbase/pocketbase
rm pocketbase_0.27.1_linux_amd64.zip
```

### 4. Create superuser for PocketBase
```bash
./pocketbase/pocketbase superuser upsert admin@yourdomain.com YourPassword123!
```

### 5. Set up PocketBase collections (run once)
```bash
# With PocketBase running and superuser created in step 4:
export PB_ADMIN_EMAIL=admin@yourdomain.com
export PB_ADMIN_PASSWORD=YourPassword123!
npm run setup:pb
```
This creates the `applied_capes` collection, user cape fields, unique Minecraft username index, and sets the app URL for password-reset links. Add SMTP vars to `.env.local` (see `.env.example`) so forgot-password emails are delivered.

### 6. Build the app
```bash
npm run build
```

### 7. Start with pm2
```bash
pm2 start ecosystem.prod.config.cjs
pm2 save
pm2 startup   # run the printed command to auto-start on reboot
```

### 8. Setup Nginx reverse proxy
```bash
sudo nano /etc/nginx/sites-available/aitherwarth
```
Paste:
```nginx
server {
    listen 80;
    server_name YOUR_VPS_IP_OR_DOMAIN;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/aitherwarth /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx
```

### 9. Free HTTPS (optional)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## Updating the site after changes

On your PC:
```powershell
git add .
git commit -m "Update"
git push
```

On VPS:
```bash
cd /var/www/aitherwarth
git pull
npm install
npm run build
pm2 restart aitherwarth-web
```
