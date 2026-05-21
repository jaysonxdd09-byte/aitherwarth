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
