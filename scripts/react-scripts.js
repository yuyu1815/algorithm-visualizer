const { spawnSync } = require('child_process');

const nodeMajorVersion = Number(process.versions.node.split('.')[0]);
const nodeOptions = nodeMajorVersion >= 17 ? ['--openssl-legacy-provider'] : [];
const [script, ...args] = process.argv.slice(2);
const scriptPath = require.resolve(`react-scripts/scripts/${script}`);

const result = spawnSync(
  process.execPath,
  [...nodeOptions, scriptPath, ...args],
  { stdio: 'inherit' },
);

if (result.error) throw result.error;

process.exit(result.status);
