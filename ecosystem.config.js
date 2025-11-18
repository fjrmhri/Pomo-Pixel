module.exports = {
  /**
   * PM2 Ecosystem Configuration for Pomo-Pixel
   *
   * Usage:
   *   pm2 start ecosystem.config.js
   *   pm2 reload ecosystem.config.js
   *   pm2 delete ecosystem.config.js
   *
   * Location: /var/www/pomo-pixel/ecosystem.config.js
   */

  apps: [
    {
      // =========================================================
      // Application Name (gunakan di pm2 list, logs, dll)
      // =========================================================
      name: "pomo-pixel",

      // =========================================================
      // Script & Arguments
      // =========================================================
      script: "npm",
      args: "start",

      // =========================================================
      // Clustering & Execution Mode
      // =========================================================
      // "cluster" = multi-process (recommended untuk production)
      // "fork" = single process
      instances: "max", // Gunakan semua core CPU
      exec_mode: "cluster",

      // =========================================================
      // Environment Variables
      // =========================================================
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },

      // =========================================================
      // Logging Configuration
      // =========================================================
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",

      // =========================================================
      // Auto-restart Settings
      // =========================================================
      // Restart jika app crash
      autorestart: true,

      // Jangan restart jika app exit dengan code 0
      max_restarts: 10,

      // Wait 4 seconds sebelum restart
      min_uptime: "10s",
      max_memory_restart: "1G",

      // =========================================================
      // Watch Mode (Optional - untuk development)
      // Set ini ke false untuk production
      // =========================================================
      watch: false,
      ignore_watch: ["node_modules", ".next", "logs"],

      // =========================================================
      // Graceful Shutdown
      // =========================================================
      kill_timeout: 5000, // 5 seconds untuk graceful shutdown

      // =========================================================
      // Health Check (Optional)
      // =========================================================
      // Uncomment jika ingin health check
      // "cron": "0 */5 * * * *",  // Every 5 minutes
      // "exec": "curl http://localhost:3000/health",

      // =========================================================
      // Merge Logs dari Multiple Instances
      // =========================================================
      merge_logs: true,

      // =========================================================
      // Working Directory
      // =========================================================
      cwd: "/var/www/pomo-pixel",
    },
  ],

  /**
   * Deploy Configuration (Optional - untuk CI/CD)
   *
   * Usage:
   *   pm2 deploy ecosystem.config.js production setup
   *   pm2 deploy ecosystem.config.js production
   */
  deploy: {
    production: {
      user: "your_user",
      host: "your_domain_or_ip",
      ref: "origin/main",
      repo: "https://github.com/fjrmhri/Pomo-Pixel.git",
      path: "/var/www/pomo-pixel",
      "post-deploy":
        "npm install && npm run build && pm2 reload ecosystem.config.js --env production",
    },
  },
};

/**
 * ==========================================================
 * SETUP INSTRUCTIONS
 * ==========================================================
 *
 * 1. Copy file ini ke /var/www/pomo-pixel/ecosystem.config.js
 *
 * 2. Buat folder logs:
 *    mkdir -p /var/www/pomo-pixel/logs
 *
 * 3. Start aplikasi:
 *    pm2 start ecosystem.config.js
 *
 * 4. Setup auto-start saat server reboot:
 *    sudo pm2 startup
 *    sudo pm2 save
 *
 * 5. Verifikasi:
 *    pm2 list
 *    pm2 logs pomo-pixel
 *
 * ==========================================================
 * USEFUL COMMANDS
 * ==========================================================
 *
 * pm2 start ecosystem.config.js       # Start aplikasi
 * pm2 list                             # List semua aplikasi
 * pm2 logs pomo-pixel                  # Lihat logs
 * pm2 logs pomo-pixel --err            # Lihat error logs
 * pm2 restart pomo-pixel               # Restart aplikasi
 * pm2 stop pomo-pixel                  # Stop aplikasi
 * pm2 delete pomo-pixel                # Delete aplikasi dari PM2
 * pm2 reload ecosystem.config.js       # Reload tanpa downtime (cluster)
 * pm2 describe pomo-pixel              # Detail informasi aplikasi
 * pm2 monit                            # Monitor real-time CPU & Memory
 *
 * ==========================================================
 * TROUBLESHOOTING
 * ==========================================================
 *
 * Aplikasi tidak start:
 *   pm2 logs pomo-pixel --err
 *   # Cek error message dan fix sesuai kebutuhan
 *
 * Port 3000 sudah digunakan:
 *   sudo lsof -i :3000
 *   sudo kill -9 <PID>
 *
 * Memory leak / crash:
 *   max_memory_restart: "1G"  # Restart otomatis jika > 1GB
 *
 * Logs terlalu besar:
 *   pm2 flush
 *   # Atau setup log rotation di PM2
 *
 * ==========================================================
 */
