#!/usr/bin/env node

// Run Prisma migration
const { execSync } = require('child_process');

try {
  console.log('Running Prisma migrations...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  console.log('✓ Migrations completed successfully');
} catch (error) {
  console.error('✗ Migration failed:', error.message);
  process.exit(1);
}
