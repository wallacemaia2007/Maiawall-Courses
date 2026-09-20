const { spawn } = require('node:child_process');

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = [];
let stopping = false;

function start(name, args) {
  const child = spawn(npmCommand, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    // No Windows, npm.cmd precisa passar pelo cmd.exe para poder ser iniciado pelo Node.
    shell: process.platform === 'win32',
  });

  child.on('exit', (code, signal) => {
    if (!stopping) {
      console.error(`${name} encerrou${signal ? ` (${signal})` : ` com código ${code}`}.`);
      stop(code || 1);
    }
  });

  child.on('error', (error) => {
    console.error(`Não foi possível iniciar ${name}:`, error.message);
    stop(1);
  });

  children.push(child);
}

function stop(exitCode = 0) {
  if (stopping) {
    return;
  }

  stopping = true;
  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }
  process.exitCode = exitCode;
}

process.once('SIGINT', () => stop());
process.once('SIGTERM', () => stop());

start('Frontend Angular', ['run', 'start', '--', '--proxy-config', 'proxy.conf.json']);
start('Backend Node', ['--prefix', 'backend', 'run', 'dev']);
