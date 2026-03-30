#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

console.log('🚀 Starting Lucidraft services with PM2...');

try {
  // Check if PM2 is installed
  execSync('pm2 --version', { stdio: 'pipe' });
  
  // Start or restart services
  console.log('📦 Starting application...');
  execSync('pm2 restart ecosystem.config.js --env production', { stdio: 'inherit' });
  
  // Save PM2 process list
  execSync('pm2 save', { stdio: 'inherit' });
  
  // Show status
  console.log('\n📊 Service Status:');
  execSync('pm2 status', { stdio: 'inherit' });
  
  console.log('\n✅ All services started successfully!');
  console.log('📝 Logs are available in the ./logs directory');
  console.log('🔍 Monitor with: pm2 monit');
  
} catch (error) {
  console.error('❌ Error starting services:', error.message);
  process.exit(1);
}
