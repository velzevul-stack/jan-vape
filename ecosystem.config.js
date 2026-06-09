const path = require('path')

const root = __dirname

module.exports = {
  apps: [
    {
      name: 'jan-vape-db',
      script: path.join(root, 'scripts/pm2-docker-db.sh'),
      interpreter: 'bash',
      cwd: root,
      instances: 1,
      autorestart: true,
      watch: false,
    },
    {
      name: 'jan-vape',
      script: path.join(root, 'scripts/pm2-start.sh'),
      interpreter: 'bash',
      cwd: root,
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
