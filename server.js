import { WebSocketServer, WebSocket } from 'ws';

const PORT = Number(process.env.PORT) || 8080;

const wss = new WebSocketServer({ port: PORT });
let nextId = 1;

function send(ws, payload) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
}

function broadcast(payload, except) {
  for (const client of wss.clients) {
    if (client !== except) send(client, payload);
  }
}

// 每 30 秒 ping 一次，清掉斷線的連線
const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, 30_000);

let count = 0
const timer = 2000
const tickLoop = (func) => {
  count = 0
  const tick = () => {
    if (count > 5) return
    if (typeof func === 'function') func()
    count++
    setTimeout(tick, timer)
  }
  setTimeout(tick, timer)
}

wss.on('connection', (ws, req) => {
  ws.id = nextId++;
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  console.log(`[+] client#${ws.id} connected from ${req.socket.remoteAddress} (total: ${wss.clients.size})`);
  send(ws, { type: 'welcome', id: ws.id, time: new Date().toISOString() });

  tickLoop(() => send(ws, { type: 'msg', data: 'haha'}))
  ws.on('message', (data, isBinary) => {
    if (isBinary) {
      console.log(`[client#${ws.id}] <binary ${data.length} bytes>`);
      ws.send(data, { binary: true });
      return;
    }

    const text = data.toString();
    console.log(`[client#${ws.id}] ${text}`);

    // 非 JSON 的訊息直接 echo 回去
    let msg;
    try {
      msg = JSON.parse(text);
    } catch {
      send(ws, { type: 'echo', data: text });
      return;
    }

    switch (msg.type) {
      case 'ping':
        send(ws, { type: 'pong', time: Date.now() });
        break;
      case 'broadcast':
        broadcast({ type: 'broadcast', from: ws.id, data: msg.data }, ws);
        send(ws, { type: 'ack', action: 'broadcast', receivers: wss.clients.size - 1 });
        break;
      case 'delay':
        // { "type": "delay", "ms": 2000, "data": ... } — 延遲後回應，用來測 timeout
        setTimeout(() => send(ws, { type: 'delayed', data: msg.data }), Number(msg.ms) || 1000);
        break;
      case 'close':
        // { "type": "close", "code": 4000, "reason": "bye" } — 讓 server 主動斷線
        ws.close(Number(msg.code) || 1000, msg.reason || 'closed by server');
        break;
      default:
        send(ws, { type: 'echo', data: msg });
    }
  });

  ws.on('close', (code, reason) => {
    console.log(`[-] client#${ws.id} disconnected (${code}${reason.length ? ` ${reason}` : ''}) (total: ${wss.clients.size})`);
  });

  ws.on('error', (err) => {
    console.error(`[!] client#${ws.id} error:`, err.message);
  });
});

wss.on('listening', () => {
  console.log(`WebSocket server listening on ws://localhost:${PORT}`);
});

wss.on('close', () => clearInterval(heartbeat));

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  wss.close(() => process.exit(0));
  for (const ws of wss.clients) ws.terminate();
});
