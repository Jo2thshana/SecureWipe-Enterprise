const { execSync } = require('child_process');

try {
  console.log('[Port Finder] Checking if port 5000 is in use...');
  let stdout;
  if (process.platform === 'win32') {
    try {
      stdout = execSync('netstat -ano', { encoding: 'utf8' });
    } catch (e) {
      stdout = '';
    }
  } else {
    try {
      stdout = execSync('lsof -i :5000 -t', { encoding: 'utf8' });
    } catch (e) {
      stdout = '';
    }
  }

  if (process.platform === 'win32') {
    const lines = stdout.split('\n');
    let terminatedAny = false;
    for (const line of lines) {
      if (line.includes(':5000') && line.includes('LISTENING')) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0' && parseInt(pid) > 0) {
          console.log(`[Port Finder] Found process ID ${pid} using port 5000. Terminating...`);
          try {
            execSync(`taskkill /F /PID ${pid}`);
            console.log(`[Port Finder] Process ${pid} terminated.`);
            terminatedAny = true;
          } catch (err) {
            console.error(`[Port Finder] Failed to terminate process ${pid}:`, err.message);
          }
        }
      }
    }
    if (terminatedAny) {
      execSync('ping 127.0.0.1 -n 2 > nul');
    }
  } else {
    if (stdout.trim()) {
      const pids = stdout.trim().split('\n');
      for (const pid of pids) {
        if (pid.trim()) {
          console.log(`[Port Finder] Found process ID ${pid} using port 5000. Terminating...`);
          try {
            execSync(`kill -9 ${pid}`);
            console.log(`[Port Finder] Process ${pid} terminated.`);
          } catch (err) {
            console.error(`[Port Finder] Failed to terminate process ${pid}:`, err.message);
          }
        }
      }
      execSync('sleep 1');
    }
  }
  console.log('[Port Finder] Port 5000 check completed.');
} catch (error) {
  console.error('[Port Finder] Error checking/freeing port:', error.message);
}
