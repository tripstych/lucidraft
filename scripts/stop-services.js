#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🛑 Stopping Lucidraft services...');

try {
  // Stop all services
  execSync('pm2 stop ecosystem.config.js', { stdio: 'inherit' });
  
  console.log('✅ All services stopped successfully!');
  
} catch (error) {
  console.error('❌ Error stopping services:', error.message);
  process.exit(1);
}
