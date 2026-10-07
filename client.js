// 互動式測試 client：輸入文字或 JSON 後按 Enter 送出
import { WebSocket } from 'ws';
import readline from 'node:readline';

const url = process.argv[2] || `ws://localhost:${process.env.PORT || 8080}`;
const ws = new WebSocket(url);
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: '> ' });

ws.on('open', () => {
  console.log(`Connected to ${url}`);
  rl.prompt();
});

ws.on('message', (data) => {
  console.log(`\n< ${data}`);
  rl.prompt();
});

ws.on('close', (code, reason) => {
  console.log(`\nDisconnected (${code}${reason.length ? ` ${reason}` : ''})`);
  process.exit(0);
});

ws.on('error', (err) => {
  console.error('Error:', err.message);
  process.exit(1);
});

rl.on('line', (line) => {
  if (line.trim()) ws.send(line);
  rl.prompt();
});

rl.on('close', () => ws.close());
