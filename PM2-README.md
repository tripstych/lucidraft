# PM2 Service Management

This project uses PM2 for process management in production environments.

## Services

- **lucidraft-web** - Next.js web application (Port 3000)
- **lucidraft-scheduler** - Python scheduler service for background tasks

## Prerequisites

Install PM2 globally:
```bash
npm install -g pm2
```

Install Python dependencies for scheduler:
```bash
pip install -r scraper/requirements.txt
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

2. Install Python dependencies:
```bash
pip install -r scraper/requirements.txt
```

3. Start services with PM2:
```bash
npm run pm2:start
```

4. Check status:
```bash
npm run pm2:status
```

## Configuration

The PM2 configuration is defined in `ecosystem.config.js`:

### lucidraft-web
- **Port**: 3000
- **Memory Limit**: 1GB
- **Auto-restart**: Enabled
- **Logs**: `./logs/out.log`, `./logs/error.log`

### lucidraft-scheduler
- **Script**: `scraper/scheduler/scheduler.py`
- **Memory Limit**: 512MB
- **Auto-restart**: Enabled
- **Logs**: `./logs/scheduler-out.log`, `./logs/scheduler-error.log`

## Environment Variables

- Production: Uses `NODE_ENV=production`
- Development: Use `--env development` flag
- Python: Uses `PYTHONPATH=./scraper`

## Monitoring

- View real-time monitoring: `npm run pm2:monit`
- Check logs: `npm run pm2:logs`
- View specific log files in `./logs/` directory

## Scheduler Service

The Python scheduler handles background tasks:
- **Cleanup tasks**: Every hour
- **Health checks**: Every 5 minutes
- **Daily maintenance**: Daily at 2:00 AM

Customize jobs in `scraper/scheduler/scheduler.py`.

## Adding New Services

To add additional services, update `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    // Existing services...
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
