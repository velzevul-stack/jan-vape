module.exports = {
  apps: [
    {
      name: 'jan-vape',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/var/www/jan-vape-suite',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
}
