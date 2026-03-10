# OpenClaw Web

OpenClaw Mobile Web Application with DDD Architecture and Agent Support.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      UI Layer (React)                        │
│  - ChatScreen, InstancesScreen, SessionSelectScreen         │
│  - Hooks: useGateway, useSession, useAgentTools             │
└────────────────────────┬────────────────────────────────────┘
                         │ 调用
┌────────────────────────▼─────────────────────────────────────┐
│                   Application Layer                           │
│  - Use Cases: SendMessage, SwitchGateway                     │
│  - Agent Tools: gateway_switch, session_send, ...           │
└────────────────────────┬─────────────────────────────────────┘
                         │ 调用
┌────────────────────────▼─────────────────────────────────────┐
│                    Domain Layer                               │
│  - 聚合根：Gateway, Session, Message                         │
│  - 领域服务：ConnectionService, SessionRepository           │
│  - 领域事件：GatewayConnected, MessageSent                  │
└────────────────────────┬─────────────────────────────────────┘
                         │ 实现
┌────────────────────────▼─────────────────────────────────────┐
│                 Infrastructure Layer                          │
│  - WebSocket 连接                                             │
│  - IndexedDB 存储                                             │
│  - localStorage 持久化                                        │
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

```
openclaw-web/
├── packages/
│   ├── domain/              # 领域层
│   ├── application/         # 应用层 (Agent Tools)
│   └── infrastructure/      # 基础设施层
└── apps/
    └── web/                 # React Web 应用
```

## Quick Start

### Prerequisites

- Node.js >= 18
- pnpm >= 10

### Installation

```bash
cd openclaw-web
pnpm install
```

### Development

```bash
pnpm dev
```

Open http://localhost:3000 in your browser.

### Build

```bash
pnpm build
```

### Test

```bash
pnpm test
```

## Agent Tools

Available Agent Tools:

### Gateway Tools

- `gateway_switch` - Switch to a different Gateway instance
- `gateway_add` - Add a new Gateway instance
- `gateway_status` - Get the status of a Gateway instance
- `gateway_list` - List all available Gateway instances
- `gateway_delete` - Delete a Gateway instance

### Session Tools

- `session_send` - Send a message to a session
- `session_list` - List available sessions
- `session_history` - Get message history for a session
- `session_select` - Select a session as current

### Message Tools

- `message_send_image` - Send an image message
- `message_delete` - Delete a message from a session

## Agent Call Examples

```
用户：切换到家里的 Gateway
  → Agent 解析：gateway_switch({ gatewayId: "home" })
  → 执行 Tool → 返回结果

用户：发送消息给张三
  → Agent 解析：session_send({ text: "你好", sessionId: "zhangsan" })
  → 执行 Tool → 返回结果

用户：添加公司 Gateway，地址是 192.168.1.100:18789
  → Agent 解析：gateway_add({ name: "公司", host: "192.168.1.100", port: 18789, token: "xxx" })
  → 执行 Tool → 返回结果
```

## License

MIT
