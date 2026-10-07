# mockServer

用 Node.js 寫的 WebSocket 測試 server，可以拿來測試前端或其他 client 的 WebSocket 連線、訊息收發、廣播、延遲回應與斷線處理。

## 環境需求

- Node.js 20 以上（`npm run dev` 用到 `node --watch`）
- npm

## 安裝

```bash
npm install
```

## 使用方式

```bash
npm start            # 啟動 server，預設 ws://localhost:8080
npm run dev          # 開發模式，存檔後自動重啟
npm run client       # 另開終端機，用內建 client 連線測試
```

### 更換 port

```bash
PORT=3000 npm start
PORT=3000 npm run client
```

### 連到其他位址

`client.js` 可以帶入要連線的 URL：

```bash
node client.js ws://192.168.1.10:8080
```

## 訊息協定

文字訊息如果是 JSON，server 會依照 `type` 欄位決定怎麼回應；不是 JSON 的文字則直接 echo。

### Client → Server

| 送出 | Server 回應 |
|---|---|
| 一般文字，例如 `hello` | `{"type":"echo","data":"hello"}` |
| `{"type":"ping"}` | `{"type":"pong","time":1791350104725}` |
| `{"type":"broadcast","data":"hi all"}` | 其他 client 會收到 `{"type":"broadcast","from":1,"data":"hi all"}`；送出者收到 `{"type":"ack","action":"broadcast","receivers":1}` |
| `{"type":"delay","ms":2000,"data":"late"}` | 等 `ms` 毫秒後回 `{"type":"delayed","data":"late"}`（沒給 `ms` 時預設 1000） |
| `{"type":"close","code":4000,"reason":"bye"}` | server 用指定的 code 和 reason 主動斷線（預設 `1000` / `closed by server`） |
| 其他 JSON | 原樣包在 `{"type":"echo","data":{...}}` 回傳 |
| Binary 資料 | 原樣以 binary 回傳 |

### Server 主動送出

| 時機 | 訊息 |
|---|---|
| 連線成功時 | `{"type":"welcome","id":1,"time":"2026-10-07T05:15:04.723Z"}`，`id` 是這個 client 的編號 |
| 連線後每 2 秒 | `{"type":"msg","data":"haha"}`，總共送 6 次 |

### 心跳檢查

server 每 30 秒會對每個 client 送一次 WebSocket ping。上一輪沒有回 pong 的連線會被直接中斷。瀏覽器和 `ws` 套件都會自動回 pong，不需要額外處理。

## 測試範例

### 用內建 client

```bash
npm start
# 另開終端機
npm run client
> hello
< {"type":"echo","data":"hello"}
> {"type":"ping"}
< {"type":"pong","time":1791350104725}
```

### 在瀏覽器 DevTools Console

```js
const ws = new WebSocket('ws://localhost:8080');
ws.onmessage = (e) => console.log(JSON.parse(e.data));
ws.onopen = () => ws.send(JSON.stringify({ type: 'ping' }));
```

### 測試廣播

開兩個 client，在其中一個送出：

```json
{"type":"broadcast","data":"hi all"}
```

另一個 client 就會收到廣播。

## Server log

server 會在終端機印出連線、訊息和斷線紀錄：

```
WebSocket server listening on ws://localhost:8080
[+] client#1 connected from ::1 (total: 1)
[client#1] hello
[-] client#1 disconnected (1005) (total: 0)
```

按 `Ctrl+C` 會關閉所有連線並結束 server。

## 專案結構

```
mockServer/
├── server.js      # WebSocket server
├── client.js      # 互動式測試 client
├── package.json
└── README.md
```
