module.exports = {
  apps: [
    {
      name: "aitherwarth-web",
      script: "powershell.exe",
      args: "-Command \"npm run dev\"",
      cwd: "C:/Users/aithe/Music/lol-main/lol-main",
      watch: false,
      autorestart: true,
      restart_delay: 2000,
      max_restarts: 50,
      env: {
        NODE_ENV: "development",
        VITE_PB_URL: "http://127.0.0.1:8090",
        VITE_PB_PUBLIC_URL: "http://127.0.0.1:8090",
        VITE_APP_URL: "http://localhost:8080",
        VITE_PB_ADMIN_EMAIL: "admin@aitherwarth.local",
        VITE_PB_ADMIN_PASSWORD: "AitherWarthPB2026!",
      },
    },
    {
      name: "pocketbase",
      script: "C:/Users/aithe/Music/lol-main/lol-main/pocketbase/pocketbase.exe",
      args: "serve --http=127.0.0.1:8090",
      cwd: "C:/Users/aithe/Music/lol-main/lol-main",
      watch: false,
      autorestart: true,
      restart_delay: 2000,
      max_restarts: 50,
    },
  ],
};
