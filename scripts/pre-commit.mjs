import { spawnSync } from 'node:child_process';

const shell = process.platform === 'win32';
const run = (cmd, args, stdio = 'inherit') => spawnSync(cmd, args, { stdio, shell });

let status = run('pnpm', ['exec', 'lint-staged']).status ?? 1;

if (run('gitleaks', ['version'], 'ignore').status === 0) {
  status ||= run('gitleaks', ['protect', '--staged', '--redact']).status ?? 1;
} else {
  console.log('gitleaks not installed; skipping secret scan (CI still scans).');
}
process.exit(status);
