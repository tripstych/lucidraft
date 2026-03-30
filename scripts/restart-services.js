#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🔄 Restarting Lucidraft services...');

try {
  // Restart all services
  execSync('pm2 restart ecosystem.config.js --env production', { stdio: 'inherit' });
  
  // Save PM2 process list
  execSync('pm2 save', { stdio: 'inherit' });
  
  // Show status
  console.log('\n📊 Service Status:');
  execSync('pm2 status', { stdio: 'inherit' });
  
  console.log('✅ All services restarted successfully!');
  
} catch (error) {
  console.error('❌ Error restarting services:', error.message);
  process.exit(1);
}
