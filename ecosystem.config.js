module.exports = {
  apps: [
    {
      name: "safartrip",
      script: "node_modules/.bin/ts-node",
      args: "--project tsconfig.server.json server.ts",
      cwd: "/var/www/safar",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "/root/.pm2/logs/safartrip-error.log",
      out_file: "/root/.pm2/logs/safartrip-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      restart_delay: 3000,
      max_restarts: 10,
    },
  ],
};
