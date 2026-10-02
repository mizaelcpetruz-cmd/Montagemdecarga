module.exports = {
  apps: [
    {
      name: 'montagem-de-carga',
      script: 'dist-server/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
    },
  ],
};
