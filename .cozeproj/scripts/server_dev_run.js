/**
 * 跨平台 Server 开发启动脚本
 * 支持: Windows, Mac, Linux
 * 
 * 使用方式:
 *   npm run dev        (Windows/Mac/Linux)
 *   npm run dev:bash  (仅 Mac/Linux)
 */

import { spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createServer } from 'net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '../..');
const SERVER_DIR = join(ROOT_DIR, 'server');
const SERVER_PORT = process.env.SERVER_PORT || '9091';

const LOG_DIR = process.env.COZE_LOG_DIR || join(ROOT_DIR, 'logs');
const LOG_SERVER_FILE = join(LOG_DIR, 'server.log');

// ANSI 颜色代码
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  const timestamp = new Date().toLocaleTimeString('zh-CN');
  console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

function checkPort(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => {
      resolve(false); // 端口被占用
    });
    server.once('listening', () => {
      server.close();
      resolve(true); // 端口可用
    });
    server.listen(port);
  });
}

async function killProcessOnPort(port) {
  const platform = process.platform;
  
  try {
    if (platform === 'win32') {
      // Windows
      execSync(`for /f "tokens=5" %a in ('netstat -ano ^| findstr :${port}') do taskkill /F /PID %a`, {
        stdio: 'ignore',
        shell: true,
      });
    } else {
      // Mac/Linux
      execSync(`lsof -ti tcp:${port} | xargs kill -9 2>/dev/null || true`, {
        stdio: 'ignore',
        shell: true,
      });
    }
    log(`已关闭占用端口 ${port} 的进程`, 'yellow');
    await new Promise(r => setTimeout(r, 1000));
  } catch (e) {
    // 忽略错误
  }
}

async function main() {
  console.log('');
  console.log('\x1b[36m╔═══════════════════════════════════════════════════════════════╗\x1b[0m');
  console.log('\x1b[36m║               DQ Admin Server - Dev Mode                    ║\x1b[0m');
  console.log('\x1b[36m╚═══════════════════════════════════════════════════════════════╝\x1b[0m');
  console.log('');
  
  log(`Server 目录: ${SERVER_DIR}`, 'blue');
  log(`Server 端口: ${SERVER_PORT}`, 'blue');
  log(`日志文件: ${LOG_SERVER_FILE}`, 'blue');
  console.log('');

  // 检查端口
  const portAvailable = await checkPort(SERVER_PORT);
  
  if (!portAvailable) {
    log(`端口 ${SERVER_PORT} 已被占用，尝试关闭...`, 'yellow');
    await killProcessOnPort(SERVER_PORT);
  }

  log('启动 server 服务...', 'green');
  console.log('');

  // 设置环境变量
  const env = {
    ...process.env,
    NODE_ENV: 'development',
    PORT: SERVER_PORT,
  };

  // 启动 tsx
  const child = spawn('npx', ['tsx', 'watch', './src/index.ts'], {
    cwd: SERVER_DIR,
    env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  child.on('error', (err) => {
    log(`启动失败: ${err.message}`, 'red');
    process.exit(1);
  });

  child.on('close', (code) => {
    if (code !== 0 && code !== null) {
      log(`Server 进程退出，代码: ${code}`, 'red');
    }
  });

  // 处理退出
  process.on('SIGINT', () => {
    log('正在关闭 server...', 'yellow');
    child.kill('SIGINT');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    log('正在关闭 server...', 'yellow');
    child.kill('SIGTERM');
    process.exit(0);
  });
}

main().catch((err) => {
  log(`错误: ${err.message}`, 'red');
  process.exit(1);
});
