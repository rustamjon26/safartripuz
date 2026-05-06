module.exports = {
  apps: [
    {
      name: "safartrip",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "/var/www/safartrip",
      instances: 2,
      exec_mode: "cluster",
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "/var/log/safartrip/error.log",
      out_file: "/var/log/safartrip/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      restart_delay: 3000,
      max_restarts: 10,
    },
  ],
};
