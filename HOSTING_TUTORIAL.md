# Tutorial Hosting Pomo-Pixel di VPS dengan Domain & SSL/TLS

Panduan lengkap untuk deploy aplikasi Next.js ke VPS dan menjalankannya 24/7.

---

## 📋 Daftar Isi

1. [Prasyarat](#prasyarat)
2. [Persiapan VPS](#persiapan-vps)
3. [Setup Node.js & npm/pnpm](#setup-nodejs--npmpnpm)
4. [Clone & Setup Aplikasi](#clone--setup-aplikasi)
5. [Konfigurasi .env.local](#konfigurasi-envlocal)
6. [Build Aplikasi](#build-aplikasi)
7. [Setup PM2 (Process Manager)](#setup-pm2-process-manager)
8. [Konfigurasi Nginx](#konfigurasi-nginx)
9. [Setup SSL/TLS dengan Let's Encrypt](#setup-ssltls-dengan-lets-encrypt)
10. [Testing & Verifikasi](#testing--verifikasi)

---

## 🔧 Prasyarat

- **VPS** dengan OS Linux (Ubuntu 20.04 LTS atau lebih baru direkomendasikan)
- **Domain** (sudah terdaftar dan pointing ke IP VPS Anda)
- **SSH Access** ke VPS
- **Root atau Sudo Access** untuk instalasi

---

## 🚀 Persiapan VPS

### 1. Update Sistem

```bash
sudo apt update
sudo apt upgrade -y
```

### 2. Install Dependencies Dasar

```bash
sudo apt install -y curl wget git build-essential
```

### 3. Setup Firewall (UFW)

```bash
sudo ufw enable
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
```

---

## 📦 Setup Node.js & npm/pnpm

### Opsi 1: Menggunakan NodeSource Repository (Direkomendasikan)

```bash
# Install Node.js v18 atau v20 (pilih salah satu)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verifikasi instalasi
node --version
npm --version
```

### Opsi 2: Menggunakan NVM (Node Version Manager)

```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Load NVM
source ~/.bashrc

# Install Node.js
nvm install 20
nvm use 20
nvm alias default 20

# Verifikasi
node --version
npm --version
```

### Install pnpm (Opsional, tapi lebih cepat)

```bash
npm install -g pnpm
pnpm --version
```

---

## 📂 Clone & Setup Aplikasi

### 1. Buat Direktori Aplikasi

```bash
sudo mkdir -p /var/www/pomo-pixel
sudo chown -R $USER:$USER /var/www/pomo-pixel
cd /var/www/pomo-pixel
```

### 2. Clone Repository

```bash
git clone https://github.com/fjrmhri/Pomo-Pixel.git .
```

### 3. Install Dependencies

```bash
# Jika menggunakan pnpm
pnpm install

# Atau jika menggunakan npm
npm install
```

---

## 🔐 Konfigurasi .env.local

### 1. Lokasi File .env.local

File `.env.local` harus diletakkan di **root direktori aplikasi** (`/var/www/pomo-pixel/`).

```bash
cd /var/www/pomo-pixel
nano .env.local
```

### 2. Contoh Isi .env.local

Sesuaikan dengan konfigurasi Anda (terutama untuk Firebase, GitHub OAuth, dll):

```env
# Firebase Config (jika menggunakan Firebase)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# GitHub OAuth (jika menggunakan GitHub Login)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=https://yourdomain.com/api/github/callback

# Node Environment
NODE_ENV=production

# Aplikasi URL
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### 3. Simpan File

- Tekan `Ctrl + X`, lalu `Y`, kemudian `Enter` (jika menggunakan `nano`)

### ⚠️ Keamanan Penting

- **Jangan** commit `.env.local` ke Git
- **Jangan** share credentials di public
- Gunakan permission file yang aman:
  ```bash
  chmod 600 .env.local
  ```

---

## 🔨 Build Aplikasi

### 1. Build untuk Production

```bash
cd /var/www/pomo-pixel

# Jika menggunakan pnpm
pnpm build

# Atau npm
npm run build
```

### 2. Verifikasi Build

Pastikan folder `.next` tercipta tanpa error:

```bash
ls -la .next/
```

---

## ⚙️ Setup PM2 (Process Manager)

PM2 akan menjalankan aplikasi Anda 24/7 dan auto-restart jika crash.

### 1. Install PM2 Globally

```bash
sudo npm install -g pm2
pm2 --version
```

### 2. Buat File ecosystem.config.js

```bash
cd /var/www/pomo-pixel
nano ecosystem.config.js
```

Isi file dengan:

```javascript
module.exports = {
  apps: [
    {
      name: "pomo-pixel",
      script: "npm",
      args: "start",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};
```

### 3. Buat Folder Logs

```bash
mkdir -p logs
```

### 4. Start Aplikasi dengan PM2

```bash
pm2 start ecosystem.config.js

# Verifikasi
pm2 list
pm2 logs pomo-pixel
```

### 5. Setup PM2 Startup (Auto-start saat VPS Reboot)

```bash
sudo pm2 startup
sudo pm2 save
```

---

## 🌐 Konfigurasi Nginx

Nginx akan bertindak sebagai reverse proxy dan menangani SSL/TLS.

### 1. Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 2. Buat Virtual Host Config

```bash
sudo nano /etc/nginx/sites-available/pomo-pixel
```

Isi dengan konfigurasi ini (ganti `yourdomain.com` dengan domain Anda):

```nginx
# Redirect HTTP ke HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        return 301 https://$server_name$request_uri;
    }

    # Let's Encrypt challenge (penting untuk SSL renewal)
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
}

# HTTPS Configuration
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Certificate (akan diisi oleh Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Root direktori aplikasi
    root /var/www/pomo-pixel;

    # Proxy ke Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss;
    gzip_min_length 1000;
    gzip_disable "msie6";

    # Logging
    access_log /var/log/nginx/pomo-pixel-access.log;
    error_log /var/log/nginx/pomo-pixel-error.log;
}
```

### 3. Enable Virtual Host

```bash
sudo ln -s /etc/nginx/sites-available/pomo-pixel /etc/nginx/sites-enabled/
```

### 4. Test Konfigurasi Nginx

```bash
sudo nginx -t
```

Output yang baik:

```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 5. Reload Nginx

```bash
sudo systemctl reload nginx
```

---

## 🔒 Setup SSL/TLS dengan Let's Encrypt

### 1. Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 2. Obtain SSL Certificate

```bash
sudo certbot certonly --webroot -w /var/www/certbot -d yourdomain.com -d www.yourdomain.com
```

Ikuti prompt dan isi email Anda.

### 3. Auto-Renew SSL (Let's Encrypt expire setiap 90 hari)

```bash
# Test renewal
sudo certbot renew --dry-run

# Setup auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### 4. Reload Nginx

```bash
sudo systemctl reload nginx
```

---

## ✅ Testing & Verifikasi

### 1. Cek Status PM2

```bash
pm2 list
pm2 logs pomo-pixel
```

### 2. Cek Status Nginx

```bash
sudo systemctl status nginx
```

### 3. Test Aplikasi

```bash
# Test dari VPS
curl http://localhost:3000

# Test dari browser
# Kunjungi https://yourdomain.com
```

### 4. Verifikasi SSL Certificate

```bash
# Cek validitas sertifikat
sudo certbot certificates

# Atau gunakan online tool:
# https://www.ssllabs.com/ssltest/
```

### 5. Cek Log Aplikasi

```bash
# Log aplikasi PM2
pm2 logs pomo-pixel

# Log Nginx access
sudo tail -f /var/log/nginx/pomo-pixel-access.log

# Log Nginx error
sudo tail -f /var/log/nginx/pomo-pixel-error.log
```

---

## 🛠️ Troubleshooting

### Aplikasi tidak berjalan (PM2)

```bash
# Lihat error detail
pm2 logs pomo-pixel --err

# Restart aplikasi
pm2 restart pomo-pixel

# Stop dan start
pm2 stop pomo-pixel
pm2 start pomo-pixel
```

### Nginx connection refused

```bash
# Pastikan aplikasi running
pm2 list

# Cek apakah port 3000 listening
sudo netstat -tlnp | grep 3000
# atau
sudo ss -tlnp | grep 3000

# Restart Nginx
sudo systemctl restart nginx
```

### SSL Certificate Error

```bash
# Renew manual
sudo certbot renew --force-renewal

# Cek pembaruan
sudo certbot certificates
```

### Port 80/443 sudah digunakan

```bash
# Cari proses yang menggunakan port
sudo lsof -i :80
sudo lsof -i :443

# Kill process jika perlu
sudo kill -9 <PID>
```

---

## 📊 Monitoring & Maintenance

### Setup Monitoring (Optional)

```bash
# Install node-exporter untuk monitoring
sudo useradd --no-create-home --shell /bin/false node_exporter
cd /tmp
wget https://github.com/prometheus/node_exporter/releases/download/v1.6.1/node_exporter-1.6.1.linux-amd64.tar.gz
tar xvfz node_exporter-1.6.1.linux-amd64.tar.gz
sudo cp node_exporter-1.6.1.linux-amd64/node_exporter /usr/local/bin/
```

### Cek Resource Usage

```bash
# CPU & Memory
top

# Disk space
df -h

# PM2 logs
pm2 logs pomo-pixel

# Nginx stats
sudo tail -f /var/log/nginx/pomo-pixel-access.log
```

### Update Aplikasi

```bash
cd /var/www/pomo-pixel

# Pull terbaru dari Git
git pull origin main

# Install dependencies baru jika ada
pnpm install

# Build ulang
pnpm build

# Restart aplikasi
pm2 restart pomo-pixel
```

---

## 🔄 Update & Maintenance Commands

### Backup Database/Data (Jika Ada)

```bash
# Contoh backup folder public/data
tar -czf backup-$(date +%Y%m%d).tar.gz /var/www/pomo-pixel/public/data/
```

### Update Nginx Config

```bash
# Edit config
sudo nano /etc/nginx/sites-available/pomo-pixel

# Test
sudo nginx -t

# Reload
sudo systemctl reload nginx
```

### Check Certificate Expiry

```bash
sudo certbot certificates
```

---

## 📝 Checklist Deployment

- [ ] VPS sudah di-setup dengan Ubuntu 20.04+
- [ ] Node.js dan npm/pnpm terinstall
- [ ] Repository di-clone ke `/var/www/pomo-pixel`
- [ ] `.env.local` sudah dikonfigurasi dengan benar
- [ ] Aplikasi sudah di-build (`pnpm build`)
- [ ] PM2 sudah di-setup dan running
- [ ] Nginx sudah dikonfigurasi dan reload
- [ ] Domain sudah pointing ke IP VPS
- [ ] Let's Encrypt SSL sudah installed
- [ ] Firewall sudah allow port 80, 443, 22
- [ ] Testing dari browser: `https://yourdomain.com` berjalan lancar
- [ ] PM2 startup sudah diaktifkan (auto-restart saat reboot)
- [ ] Log file sudah di-check, tidak ada error

---

## 🎉 Selesai!

Aplikasi Anda sekarang running 24/7 di VPS dengan:

- ✅ Domain kustom
- ✅ HTTPS SSL/TLS
- ✅ Auto-restart jika crash
- ✅ Auto-update SSL (90 hari)
- ✅ Reverse proxy Nginx

**Setiap kali update aplikasi:**

```bash
cd /var/www/pomo-pixel
git pull origin main
pnpm install
pnpm build
pm2 restart pomo-pixel
```

---

## 📚 Referensi Tambahan

- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment/static-exports)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Ubuntu Firewall Guide](https://help.ubuntu.com/community/UFW)

---

**Pertanyaan? Hubungi support VPS Anda atau cek log untuk detail error.**
