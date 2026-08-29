// Compatibility launcher for installations that still run pm2 start app.js.
// The application itself is implemented in Go.
const { spawn } = require('node:child_process');
const { existsSync } = require('node:fs');
const { join } = require('node:path');

const binary = join(__dirname, 'bin', 'blog');
const command = existsSync(binary) ? binary : 'go';
const args = existsSync(binary) ? [] : ['run', './cmd/blog'];
const child = spawn(command, args, { cwd: __dirname, env: process.env, stdio: 'inherit' });

let shuttingDown = false;
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    if (shuttingDown) return;
    shuttingDown = true;
    child.kill(signal);
    setTimeout(() => process.exit(0), 5000).unref();
  });
}
child.on('exit', (code) => process.exit(code ?? 0));
