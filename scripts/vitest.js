'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

const rawArgs = process.argv.slice(2);
const vitestArgs = [];
let watch = false;

for (let i = 0; i < rawArgs.length; i += 1) {
  const arg = rawArgs[i];

  if (arg === '--watchAll=false') {
    continue;
  }

  if (arg === '--watchAll=true') {
    watch = true;
    continue;
  }

  if (arg === '--watchAll') {
    const value = rawArgs[i + 1];

    if (value === 'true' || value === 'false') {
      watch = value === 'true';
      i += 1;
      continue;
    }
  }

  vitestArgs.push(arg);
}

const vitestPackagePath = require.resolve('vitest/package.json');
const { bin } = require(vitestPackagePath);
const vitestBin = path.resolve(path.dirname(vitestPackagePath), bin.vitest);
const result = spawnSync(process.execPath, [vitestBin, watch ? '' : 'run', ...vitestArgs].filter(Boolean), {
  stdio: 'inherit',
});

if (result.error) throw result.error;

if (result.signal) {
  process.exit(1);
}

process.exit(result.status);
