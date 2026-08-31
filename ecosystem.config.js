// PM2 runs the custom Socket.IO server through tsx, so tsx is a production
// dependency — an `npm ci --omit=dev` would otherwise leave nothing to start.
module.exports = {
  apps: [
    {
      name: "safartrip",
      script: "node_modules/.bin/tsx",
      args: "server.ts",
      cwd: "/var/www/safar",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "/var/www/safar/logs/safartrip-error.log",
      out_file: "/var/www/safar/logs/safartrip-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      restart_delay: 3000,
      max_restarts: 10,
    },
    {
      // Expires hotel/homestay holds AND taxi/guide bookings. Every minute:
      // the taxi PENDING timeout is 5 min and guide transitions are wall-clock,
      // so a coarser schedule would leave orders visibly stuck.
      name: "safartrip-expire-holds",
      cwd: "/var/www/safar",
      script: "npx",
      args: "tsx scripts/expire-booking-holds.ts",
      cron_restart: "*/1 * * * *",
      autorestart: false,
      env: {
        NODE_ENV: "production",
      },
      error_file: "/var/www/safar/logs/safartrip-expire-holds-error.log",
      out_file: "/var/www/safar/logs/safartrip-expire-holds-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
    {
      name: "safartrip-outbox",
      cwd: "/var/www/safar",
      script: "npx",
      args: "tsx scripts/outbox-relay.ts",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      env: {
        NODE_ENV: "production",
        OUTBOX_POLL_MS: 2000,
        OUTBOX_BATCH: 20,
        OUTBOX_MAX_ATTEMPTS: 8,
      },
      error_file: "/var/www/safar/logs/safartrip-outbox-error.log",
      out_file: "/var/www/safar/logs/safartrip-outbox-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      restart_delay: 3000,
      max_restarts: 20,
    },
  ],
};
