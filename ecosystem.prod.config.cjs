module.exports = {
  apps: [
    {
      name: "aitherwarth-web",
      script: "npm",
      args: "run preview -- --port 3000 --host",
      cwd: "/var/www/aitherwarth",
      autorestart: true,
      restart_delay: 2000,
      max_restarts: 50,
      env: {
        NODE_ENV: "production",
        VITE_PB_URL: "http://127.0.0.1:8090",
      },
    },
    {
      name: "pocketbase",
      script: "/var/www/aitherwarth/pocketbase/pocketbase",
      args: "serve --http=127.0.0.1:8090",
      cwd: "/var/www/aitherwarth",
      autorestart: true,
      restart_delay: 2000,
      max_restarts: 50,
    },
  ],
};
