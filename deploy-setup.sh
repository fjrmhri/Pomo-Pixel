#!/bin/bash

# ================================================================
# Pomo-Pixel VPS Deployment Script
# Automated setup untuk hosting di VPS
# 
# Usage:
#   chmod +x deploy-setup.sh
#   ./deploy-setup.sh
# ================================================================

set -e  # Exit jika ada error

echo "=========================================="
echo "Pomo-Pixel VPS Deployment Setup"
echo "=========================================="

# ================================================================
# 1. System Update
# ================================================================
echo ""
echo "[1/10] Updating system packages..."
sudo apt update
sudo apt upgrade -y

# ================================================================
# 2. Install Dependencies
# ================================================================
echo ""
echo "[2/10] Installing dependencies..."
sudo apt install -y curl wget git build-essential

# ================================================================
# 3. Setup Firewall
# ================================================================
echo ""
echo "[3/10] Setting up firewall..."
sudo ufw enable --force || true
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# ================================================================
# 4. Install Node.js
# ================================================================
echo ""
echo "[4/10] Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# ================================================================
# 5. Install pnpm (Optional but faster)
# ================================================================
echo ""
echo "[5/10] Installing pnpm..."
sudo npm install -g pnpm

# ================================================================
# 6. Create Application Directory
# ================================================================
echo ""
echo "[6/10] Creating application directory..."
sudo mkdir -p /var/www/pomo-pixel
sudo chown -R $USER:$USER /var/www/pomo-pixel
mkdir -p /var/www/pomo-pixel/logs

# ================================================================
# 7. Clone Repository
# ================================================================
echo ""
echo "[7/10] Cloning repository..."
cd /var/www/pomo-pixel
if [ ! -d ".git" ]; then
    git clone https://github.com/fjrmhri/Pomo-Pixel.git .
else
    git pull origin main
fi

# ================================================================
# 8. Install PM2
# ================================================================
echo ""
echo "[8/10] Installing PM2..."
sudo npm install -g pm2

# ================================================================
# 9. Install Nginx & Certbot
# ================================================================
echo ""
echo "[9/10] Installing Nginx & Certbot..."
sudo apt install -y nginx certbot python3-certbot-nginx

# ================================================================
# 10. Create .env.local
# ================================================================
echo ""
echo "[10/10] Creating .env.local template..."
if [ ! -f ".env.local" ]; then
    cp .env.local.example .env.local
    chmod 600 .env.local
    echo "✓ .env.local created. Please edit it with your settings:"
    echo "  nano /var/www/pomo-pixel/.env.local"
else
    echo "✓ .env.local already exists"
fi

# ================================================================
# Summary
# ================================================================
echo ""
echo "=========================================="
echo "✓ Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Edit .env.local dengan konfigurasi Anda:"
echo "   nano /var/www/pomo-pixel/.env.local"
echo ""
echo "2. Build aplikasi:"
echo "   cd /var/www/pomo-pixel"
echo "   pnpm install"
echo "   pnpm build"
echo ""
echo "3. Start aplikasi dengan PM2:"
echo "   pm2 start ecosystem.config.js"
echo "   pm2 save"
echo "   sudo pm2 startup"
echo ""
echo "4. Setup Nginx:"
echo "   sudo cp nginx-config-template.conf /etc/nginx/sites-available/pomo-pixel"
echo "   sudo nano /etc/nginx/sites-available/pomo-pixel  # Edit domain"
echo "   sudo ln -s /etc/nginx/sites-available/pomo-pixel /etc/nginx/sites-enabled/"
echo "   sudo nginx -t"
echo "   sudo systemctl reload nginx"
echo ""
echo "5. Setup SSL with Let's Encrypt:"
echo "   sudo certbot certonly --webroot -w /var/www/certbot -d yourdomain.com"
echo "   sudo systemctl reload nginx"
echo ""
echo "6. Enable SSL auto-renewal:"
echo "   sudo systemctl enable certbot.timer"
echo ""
echo "For more info, read: HOSTING_TUTORIAL.md"
echo "=========================================="
