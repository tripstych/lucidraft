# PM2 Service Management

This project uses PM2 for process management in production environments.

## Prerequisites

Install PM2 globally:
```bash
npm install -g pm2
```

## Available Scripts

- `npm run pm2:start` - Start all services
- `npm run pm2:stop` - Stop all services  
- `npm run pm2:restart` - Restart all services
- `npm run pm2:status` - Check service status
- `npm run pm2:logs` - View service logs
- `npm run pm2:monit` - Open PM2 monitoring dashboard

## Quick Start

1. Build the application:
```bash
npm run build
```

2. Start services with PM2:
```bash
npm run pm2:start
```

3. Check status:
```bash
npm run pm2:status
```

## Configuration

The PM2 configuration is defined in `ecosystem.config.js`:

- **App Name**: lucidraft-web
- **Port**: 3000
- **Memory Limit**: 1GB
- **Auto-restart**: Enabled
- **Logs**: Stored in `./logs/` directory

## Environment Variables

- Production: Uses `NODE_ENV=production`
- Development: Use `--env development` flag

## Monitoring

- View real-time monitoring: `npm run pm2:monit`
- Check logs: `npm run pm2:logs`
- View specific log files in `./logs/` directory

## Adding New Services

To add additional services, update `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    // Existing service...
    {
      name: 'new-service',
      script: 'npm',
      args: 'start',
      cwd: './path/to/service',
      // ... other config
    }
  ]
};
```

## Deployment

The ecosystem config includes deployment configurations for production and staging environments. Update the deploy section with your server details before using.
