# OpenClaw 手机网页版 - DDD 架构设计 (支持 Agent 调用)

## 上下文

**目标**: 为 openclaw 设计一个手机网页版 channel，支持 AI Agent 调用

**设计原则**:
1. **本质** - 领域模型反映业务本质
2. **简单** - 领域层纯 TS，无框架依赖
3. **核心** - 聚焦核心领域：Gateway、Session、Message
4. **闭环** - MVP 可独立运行，后续功能可插拔
5. **Agent 友好** - 所有领域服务都可被 Agent 通过 Tool 调用

---

## 零、现状分析 (Exploration Findings)

### 现有项目位置
- **主项目**: `C:\Users\cheng\Desktop\clawface\openclaw`
- **类型**: pnpm monorepo (单包结构，非多包)
- **构建工具**: tsdown (构建), Vitest (测试), Oxlint (linting)
- **核心依赖**:
  - `@mariozechner/pi-agent-core@0.57.1` (AgentTool 接口)
  - `@sinclair/typebox@0.34.48` (schema)

### AgentTool 接口定义
从现有代码 (`src/agents/tools/common.ts`, `src/channels/plugins/types.core.ts`):
```typescript
export type ChannelAgentTool = AgentTool<TSchema, unknown> & {
  ownerOnly?: boolean;
};
// AgentTool 有 parameters (TypeBox schema) 和 execute 方法
```

### 关键发现
1. **无现有 Web UI**: 没有 `apps/web` React 应用
2. **无 DDD 分层**: 没有 `packages/domain/application/infrastructure` 分离
3. **需新建结构**: 需要在 openclaw 项目内或独立创建新的 monorepo

### 架构决策
- 选择在 openclaw 项目外独立创建新的 monorepo `openclaw-web`
- 复用现有的 `@mariozechner/pi-agent-core` AgentTool 接口
- 领域层保持纯 TS，无 React/Vue 等框架依赖

---

## 一、整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      UI Layer (React)                        │
│  - ChatScreen, InstanceScreen                               │
│  - Hooks: useGateway, useSession                            │
└────────────────────────┬─────────────────────────────────────┘
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

---

## 二、领域层 (Domain Layer)

### 2.1 核心聚合根

```typescript
// packages/domain/src/entities/gateway.ts

/** Gateway 连接信息（值对象） */
export interface Endpoint {
  host: string
  port: number
  tls: boolean
}

/** 设备认证信息（值对象） */
export interface DeviceAuth {
  deviceId: string
  token: string
}

/** Gateway 状态 */
export type GatewayStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

/** Gateway 聚合根 */
export interface Gateway {
  readonly id: string              // 业务 ID（UUID）
  readonly name: string            // 用户定义名称
  readonly endpoint: Endpoint      // 连接地址
  readonly auth: DeviceAuth        // 认证信息
  status: GatewayStatus
  connectedAt: number | null
  error: GatewayError | null
}

export interface GatewayError {
  code: string
  message: string
  at: number
}
```

```typescript
// packages/domain/src/entities/session.ts

/** Session 键（值对象） */
export interface SessionKey {
  gatewayId: string
  agentId: string
  channelId: string
}

/** Session 状态 */
export type SessionStatus = 'active' | 'idle' | 'archived'

/** Session 聚合根 */
export interface Session {
  readonly key: SessionKey
  gatewayId: string
  displayName: string | null
  status: SessionStatus
  messages: Message[]
  pendingToolCalls: ToolCall[]
  updatedAt: number
}

/** 消息实体（Session 聚合内） */
export interface Message {
  id: string
  sessionId: SessionKey
  role: 'user' | 'assistant' | 'system'
  content: MessageContent[]
  timestamp: number
}

export interface MessageContent {
  type: 'text' | 'image' | 'file'
  text?: string
  mimeType?: string
  url?: string
  base64?: string
}

/** 工具调用实体 */
export interface ToolCall {
  toolCallId: string
  name: string
  args: Record<string, unknown>
  status: 'pending' | 'completed' | 'failed'
  result?: string
  startedAt: number
  completedAt?: number
}
```

### 2.2 领域事件

```typescript
// packages/domain/src/events/index.ts

/** 领域事件基类 */
export interface DomainEvent {
  type: string
  timestamp: number
  aggregateId: string
}

/** Gateway 相关事件 */
export interface GatewayConnectedEvent extends DomainEvent {
  type: 'GatewayConnected'
  gatewayId: string
}

export interface GatewayDisconnectedEvent extends DomainEvent {
  type: 'GatewayDisconnected'
  gatewayId: string
}

export interface GatewayErrorEvent extends DomainEvent {
  type: 'GatewayError'
  gatewayId: string
  error: GatewayError
}

/** Session 相关事件 */
export interface MessageSentEvent extends DomainEvent {
  type: 'MessageSent'
  sessionId: SessionKey
  messageId: string
  role: string
}

export interface MessageReceivedEvent extends DomainEvent {
  type: 'MessageReceived'
  sessionId: SessionKey
  messageId: string
  content: string
}

export interface SessionCreatedEvent extends DomainEvent {
  type: 'SessionCreated'
  sessionId: SessionKey
  gatewayId: string
}
```

### 2.3 Repository 接口

```typescript
// packages/domain/src/repositories/gateway-repository.ts

export interface GatewayRepository {
  findAll(): Promise<Gateway[]>
  findById(id: string): Promise<Gateway | null>
  save(gateway: Gateway): Promise<void>
  delete(id: string): Promise<void>
  observe(id: string): Observable<Gateway>
}
```

```typescript
// packages/domain/src/repositories/session-repository.ts

export interface SessionRepository {
  findAll(gatewayId: string): Promise<Session[]>
  findByKey(key: SessionKey): Promise<Session | null>
  save(session: Session): Promise<void>
  observeMessages(key: SessionKey): Observable<Message[]>
}
```

### 2.4 领域服务

```typescript
// packages/domain/src/services/gateway-connection.ts

export interface GatewayConnectionService {
  readonly status$: Observable<GatewayStatus>
  readonly error$: Observable<GatewayError | null>

  connect(gateway: Gateway): Promise<void>
  disconnect(gatewayId: string): Promise<void>
  reconnect(gatewayId: string): Promise<void>
  request<T>(method: string, params: unknown): Promise<T>
  onEvent<T>(eventType: string, handler: (payload: T) => void): () => void
}
```

```typescript
// packages/domain/src/services/message-service.ts

export interface MessageService {
  sendText(session: Session, text: string): Promise<void>
  streamReply(
    session: Session,
    onChunk: (text: string) => void,
    onComplete: () => void
  ): Promise<void>
}
```

---

## 三、应用层 (Application Layer) - Agent Tools

### 3.1 Agent Tool 定义

复用 openclaw 现有的 AgentTool 格式，使用 `@mariozechner/pi-agent-core` 的 `AgentTool` 接口：

```typescript
// packages/application/src/tools/types.ts

import type { AgentTool } from "@mariozechner/pi-agent-core"
import type { TSchema } from "@sinclair/typebox"

// AgentTool<TSchema, TResult>
// - parameters: TypeBox schema
// - execute: (toolCallId, args) => Promise<TResult>

export type AppTool = AgentTool<TSchema, unknown> & {
  ownerOnly?: boolean  // 仅所有者可用
  category: 'gateway' | 'session' | 'message' | 'instance'
}
```

### 3.2 Gateway 相关 Tools

```typescript
// packages/application/src/tools/gateway-switch.ts

import { Type } from "@sinclair/typebox"
import type { AppTool } from "./types"

const GatewaySwitchSchema = Type.Object({
  gatewayId: Type.String({
    description: "Gateway ID or name (e.g., 'home', 'work')"
  }),
})

export function createGatewaySwitchTool(
  gatewayRepo: GatewayRepository,
  connection: GatewayConnectionService
): AppTool {
  return {
    name: "gateway_switch",
    description: "Switch to a different OpenClaw Gateway instance",
    label: "Gateway Switch",
    category: "gateway",
    parameters: GatewaySwitchSchema,
    execute: async (toolCallId, args) => {
      const { gatewayId } = args as { gatewayId: string }

      // 1. 获取 Gateway
      const gateway = await gatewayRepo.findById(gatewayId)
      if (!gateway) {
        return { success: false, error: `Gateway '${gatewayId}' not found` }
      }

      // 2. 断开当前连接
      await connection.disconnect()

      // 3. 建立新连接
      await connection.connect(gateway)

      return {
        success: true,
        gatewayId: gateway.id,
        gatewayName: gateway.name,
        endpoint: `${gateway.endpoint.host}:${gateway.endpoint.port}`
      }
    }
  }
}
```

```typescript
// packages/application/src/tools/gateway-add.ts

const GatewayAddSchema = Type.Object({
  name: Type.String({ description: "Gateway name (e.g., '家里', '公司')" }),
  host: Type.String({ description: "Gateway host (IP or domain)" }),
  port: Type.Number({ description: "Gateway port (default: 18789)" }),
  tls: Type.Optional(Type.Boolean({ description: "Use WSS instead of WS" })),
  token: Type.String({ description: "Gateway auth token" }),
})

export function createGatewayAddTool(
  gatewayRepo: GatewayRepository,
  connection: GatewayConnectionService
): AppTool {
  return {
    name: "gateway_add",
    description: "Add a new OpenClaw Gateway instance",
    label: "Gateway Add",
    category: "gateway",
    parameters: GatewayAddSchema,
    execute: async (toolCallId, args) => {
      const { name, host, port, tls, token } = args as {
        name: string
        host: string
        port: number
        tls?: boolean
        token: string
      }

      const gateway: Gateway = {
        id: generateId(),
        name,
        endpoint: { host, port: port || 18789, tls: tls || false },
        auth: { deviceId: generateDeviceId(), token },
        status: 'disconnected',
        connectedAt: null,
        error: null
      }

      await gatewayRepo.save(gateway)

      return {
        success: true,
        gatewayId: gateway.id,
        message: `Gateway '${name}' added successfully`
      }
    }
  }
}
```

```typescript
// packages/application/src/tools/gateway-status.ts

const GatewayStatusSchema = Type.Object({
  gatewayId: Type.Optional(Type.String({ description: "Gateway ID, defaults to current" })),
})

export function createGatewayStatusTool(
  gatewayRepo: GatewayRepository,
  connection: GatewayConnectionService
): AppTool {
  return {
    name: "gateway_status",
    description: "Get the status of a Gateway instance",
    label: "Gateway Status",
    category: "gateway",
    parameters: GatewayStatusSchema,
    execute: async (toolCallId, args) => {
      const { gatewayId } = args as { gatewayId?: string }

      const gateways = await gatewayRepo.findAll()
      const target = gatewayId
        ? gateways.find(g => g.id === gatewayId || g.name === gatewayId)
        : gateways.find(g => g.status === 'connected')

      if (!target) {
        return { success: false, error: 'Gateway not found' }
      }

      return {
        success: true,
        gateway: {
          id: target.id,
          name: target.name,
          status: target.status,
          endpoint: `${target.endpoint.host}:${target.endpoint.port}`,
          connectedAt: target.connectedAt
        }
      }
    }
  }
}
```

### 3.3 Session 相关 Tools

```typescript
// packages/application/src/tools/session-send.ts

const SessionSendSchema = Type.Object({
  text: Type.String({ description: "Message text to send" }),
  sessionId: Type.Optional(Type.String({ description: "Session key, defaults to current" })),
})

export function createSessionSendTool(
  sessionRepo: SessionRepository,
  messageService: MessageService
): AppTool {
  return {
    name: "session_send",
    description: "Send a message to the current or specified session",
    label: "Send Message",
    category: "session",
    parameters: SessionSendSchema,
    execute: async (toolCallId, args) => {
      const { text, sessionId } = args as { text: string, sessionId?: string }

      // 获取当前会话
      const session = await sessionRepo.findByKey(parseSessionKey(sessionId || 'current'))
      if (!session) {
        return { success: false, error: 'Session not found' }
      }

      // 发送消息
      await messageService.sendText(session, text)

      return {
        success: true,
        messageId: generateId(),
        timestamp: Date.now()
      }
    }
  }
}
```

```typescript
// packages/application/src/tools/session-list.ts

const SessionListSchema = Type.Object({
  gatewayId: Type.Optional(Type.String({ description: "Gateway ID, defaults to current" })),
  limit: Type.Optional(Type.Number({ description: "Max sessions to return", default: 10 })),
})

export function createSessionListTool(
  sessionRepo: SessionRepository
): AppTool {
  return {
    name: "session_list",
    description: "List available sessions",
    label: "List Sessions",
    category: "session",
    parameters: SessionListSchema,
    execute: async (toolCallId, args) => {
      const { gatewayId, limit = 10 } = args as { gatewayId?: string, limit?: number }

      const sessions = await sessionRepo.findAll(gatewayId || 'current')

      return {
        success: true,
        sessions: sessions.slice(0, limit).map(s => ({
          key: s.key,
          displayName: s.displayName,
          messageCount: s.messages.length,
          updatedAt: s.updatedAt
        }))
      }
    }
  }
}
```

```typescript
// packages/application/src/tools/session-history.ts

const SessionHistorySchema = Type.Object({
  sessionId: Type.String({ description: "Session key" }),
  limit: Type.Optional(Type.Number({ description: "Max messages to return", default: 20 })),
})

export function createSessionHistoryTool(
  sessionRepo: SessionRepository
): AppTool {
  return {
    name: "session_history",
    description: "Get message history for a session",
    label: "Session History",
    category: "session",
    parameters: SessionHistorySchema,
    execute: async (toolCallId, args) => {
      const { sessionId, limit = 20 } = args as { sessionId: string, limit?: number }

      const session = await sessionRepo.findByKey(parseSessionKey(sessionId))
      if (!session) {
        return { success: false, error: 'Session not found' }
      }

      return {
        success: true,
        messages: session.messages.slice(-limit).map(m => ({
          id: m.id,
          role: m.role,
          content: m.content.find(c => c.type === 'text')?.text || '',
          timestamp: m.timestamp
        }))
      }
    }
  }
}
```

### 3.4 Tool 注册表

```typescript
// packages/application/src/tools/registry.ts

import type { AppTool } from "./types"

export class ToolRegistry {
  private tools = new Map<string, AppTool>()

  register(tool: AppTool): void {
    this.tools.set(tool.name, tool)
  }

  get(name: string): AppTool | undefined {
    return this.tools.get(name)
  }

  list(category?: string): AppTool[] {
    const all = Array.from(this.tools.values())
    return category ? all.filter(t => t.category === category) : all
  }

  toAgentTools(): AppTool[] {
    return this.list()
  }
}

// 创建 Tool Registry
export function createToolRegistry(
  gatewayRepo: GatewayRepository,
  sessionRepo: SessionRepository,
  connection: GatewayConnectionService,
  messageService: MessageService
): ToolRegistry {
  const registry = new ToolRegistry()

  // Gateway Tools
  registry.register(createGatewaySwitchTool(gatewayRepo, connection))
  registry.register(createGatewayAddTool(gatewayRepo, connection))
  registry.register(createGatewayStatusTool(gatewayRepo, connection))

  // Session Tools
  registry.register(createSessionSendTool(sessionRepo, messageService))
  registry.register(createSessionListTool(sessionRepo))
  registry.register(createSessionHistoryTool(sessionRepo))

  return registry
}
```

---

## 四、基础设施层 (Infrastructure Layer)

```typescript
// packages/infrastructure/src/gateway-connection.impl.ts

import { GatewayConnectionService, Gateway, GatewayStatus } from '@openclaw/domain'

export class WebSocketGatewayConnection implements GatewayConnectionService {
  private ws: WebSocket | null = null
  private currentGateway: Gateway | null = null
  private eventHandlers = new Map<string, Set<(...args: unknown[]) => void>>()

  readonly status$ = new BehaviorSubject<GatewayStatus>('disconnected')
  readonly error$ = new BehaviorSubject<GatewayError | null>(null)

  async connect(gateway: Gateway): Promise<void> {
    this.currentGateway = gateway
    this.status$.next('connecting')

    const scheme = gateway.endpoint.tls ? 'wss' : 'ws'
    const url = `${scheme}://${gateway.endpoint.host}:${gateway.endpoint.port}`

    this.ws = new WebSocket(url)

    this.ws.onopen = () => {
      this.status$.next('connected')
      this.authenticate(gateway.auth)
    }

    this.ws.onmessage = (event) => {
      this.handleMessage(JSON.parse(event.data))
    }

    this.ws.onerror = () => {
      this.status$.next('error')
      this.error$.next({
        code: 'CONNECTION_ERROR',
        message: 'Failed to connect',
        at: Date.now()
      })
    }
  }

  async request<T>(method: string, params: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = generateId()
      const frame = { type: 'req', id, method, params }
      this.ws?.send(JSON.stringify(frame))

      const handler = (response: { id: string; ok: boolean; payload?: T; error?: unknown }) => {
        if (response.id === id) {
          this.off('response', handler)
          if (response.ok) {
            resolve(response.payload as T)
          } else {
            reject(response.error)
          }
        }
      }

      this.on('response', handler)
      setTimeout(() => {
        this.off('response', handler)
        reject(new Error('Request timeout'))
      }, 15000)
    })
  }

  on(eventType: string, handler: (...args: unknown[]) => void): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set())
    }
    this.eventHandlers.get(eventType)!.add(handler)
    return () => this.eventHandlers.get(eventType)?.delete(handler)
  }

  private off(eventType: string, handler: (...args: unknown[]) => void): void {
    this.eventHandlers.get(eventType)?.delete(handler)
  }

  private handleMessage(frame: unknown): void {
    // 处理 Gateway 响应
    if (frame && typeof frame === 'object' && 'type' in frame) {
      this.emit(frame.type, frame)
    }
  }

  private emit(eventType: string, ...args: unknown[]): void {
    this.eventHandlers.get(eventType)?.forEach(h => h(...args))
  }
}
```

---

## 五、UI 层 (Presentation Layer)

```typescript
// apps/web/src/hooks/use-agent-tools.ts

/** UI Hook: 获取可用的 Agent Tools */
export function useAgentTools(): AppTool[] {
  const container = useDIContainer()
  const [tools, setTools] = useState<AppTool[]>([])

  useEffect(() => {
    const registry = container.toolRegistry
    setTools(registry.toAgentTools())
  }, [])

  return tools
}

/** UI Hook: 执行 Tool */
export function useExecuteTool() {
  const container = useDIContainer()

  const execute = useCallback(async (toolName: string, args: Record<string, unknown>) => {
    const tool = container.toolRegistry.get(toolName)
    if (!tool) {
      throw new Error(`Tool '${toolName}' not found`)
    }

    const result = await tool.execute(generateId(), args)
    return result
  }, [])

  return execute
}
```

---

## 六、目录结构

```
openclaw-web/
├── packages/
│   ├── domain/              # 领域层
│   │   ├── src/
│   │   │   ├── entities/    # 聚合根
│   │   │   ├── events/      # 领域事件
│   │   │   ├── repositories/# Repository 接口
│   │   │   └── services/    # 领域服务接口
│   │   └── package.json
│   │
│   ├── application/         # 应用层 (Agent Tools)
│   │   ├── src/
│   │   │   ├── tools/       # Agent Tools
│   │   │   │   ├── gateway-switch.ts
│   │   │   │   ├── gateway-add.ts
│   │   │   │   ├── session-send.ts
│   │   │   │   └── registry.ts
│   │   │   └── container.ts
│   │   └── package.json
│   │
│   ├── infrastructure/      # 基础设施层
│   │   ├── src/
│   │   │   ├── gateway-connection.impl.ts
│   │   │   ├── repositories.impl.ts
│   │   │   └── message-service.impl.ts
│   │   └── package.json
│   │
│   └── ui/                  # 共享 UI 组件
│       └── src/
│
├── apps/
│   └── web/                 # React Web 应用
│       ├── src/
│       │   ├── screens/
│       │   ├── hooks/
│       │   └── App.tsx
│       └── package.json
│
└── package.json
```

---

## 七、Agent 调用示例

### 自然语言命令 → Tool 调用

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

---

## 八、实施计划 (Final Implementation Plan)

**开发原则**:
- 接口先行：先定义接口/类型，再实现
- 并行开发：领域层和基础设施层并行
- 测试驱动：每个模块先写测试
- 一步一 commit：每个功能点完成后立即 commit

**位置决策**: 独立创建新的 monorepo `openclaw-web`

### Phase 1: 项目初始化 + 领域层

**Task 1.1**: 创建项目结构
- [x] 创建 `packages/domain/package.json` - name: `@openclaw/web-domain`
- [x] 创建 `packages/application/package.json` - name: `@openclaw/web-application`
- [x] 创建 `packages/infrastructure/package.json` - name: `@openclaw/web-infrastructure`
- [x] 创建 `apps/web/package.json` - name: `@openclaw/web`
- [x] 更新根 `pnpm-workspace.yaml`
- [x] 配置 TypeScript (各包 tsconfig.json)
- [x] 配置 Vitest (vitest.config.ts)
- commit: `feat(web): init monorepo structure`

**Task 1.2**: 领域层 - 实体定义
- [x] `packages/domain/src/entities/gateway.ts`
  - Endpoint, DeviceAuth (值对象)
  - GatewayStatus, GatewayError
  - Gateway 聚合根
- [x] `packages/domain/src/entities/session.ts`
  - SessionKey, SessionStatus
  - Session, Message, MessageContent, ToolCall
- [x] `packages/domain/src/entities/index.ts` - 导出
- [x] `packages/domain/src/utils/id-generator.ts` - generateId(), generateDeviceId()
- [x] 编写单元测试 (vitest)
- commit: `domain: add entities`

**Task 1.3**: 领域层 - Repository 接口
- [x] `packages/domain/src/repositories/gateway-repository.ts`
- [x] `packages/domain/src/repositories/session-repository.ts`
- [x] `packages/domain/src/repositories/index.ts`
- [x] 编写单元测试（使用 Mock 实现）
- commit: `domain: add repository interfaces`

**Task 1.4**: 领域层 - 领域服务接口
- [x] `packages/domain/src/services/gateway-connection.ts`
- [x] `packages/domain/src/services/message-service.ts`
- [x] `packages/domain/src/services/index.ts`
- [x] `packages/domain/src/events/index.ts` - 领域事件定义
- commit: `domain: add service interfaces`

### Phase 2: 基础设施层

**Task 2.1**: WebSocket 连接实现
- [x] `packages/infrastructure/src/gateway-connection.impl.ts`
  - WebSocketGatewayConnection 类
  - BehaviorSubject (使用 rxjs 或简单实现)
- [x] `packages/infrastructure/src/protocol.ts` - RPC 协议帧格式
- [x] 编写单元测试
- commit: `infra: WebSocket connection`

**Task 2.2**: Repository 实现
- [x] `packages/infrastructure/src/repositories.impl.ts` - localStorage
- [x] `packages/infrastructure/src/session-repository.impl.ts` - IndexedDB (使用 idb 库)
- [x] `packages/infrastructure/src/storage/idb.ts` - IndexedDB 封装
- [x] `packages/infrastructure/src/storage/local-storage.ts` - localStorage 封装
- [x] 编写单元测试
- commit: `infra: repository implementations`

**Task 2.3**: Message Service 实现
- [x] `packages/infrastructure/src/message-service.impl.ts`
- [x] 实现 sendText, streamReply
- commit: `infra: message service`

### Phase 3: 应用层 - Agent Tools

**Task 3.1**: Tool 基础
- [x] `packages/application/src/tools/types.ts`
  - AppTool 类型 (扩展 ChannelAgentTool)
  - ownerOnly, category 字段
- [x] `packages/application/src/tools/registry.ts` - ToolRegistry 类
- [x] `packages/application/src/tools/helpers.ts`
  - generateId, parseSessionKey 等
- [x] `packages/application/src/container.ts` - DI 容器
- commit: `app: tool infrastructure`

**Task 3.2**: Gateway Tools
- [x] `packages/application/src/tools/gateway-switch.ts`
- [x] `packages/application/src/tools/gateway-add.ts`
- [x] `packages/application/src/tools/gateway-status.ts`
- [x] `packages/application/src/tools/gateway-list.ts`
- [x] `packages/application/src/tools/gateway-delete.ts`
- [x] 编写单元测试 (Mock Repository + Connection)
- commit: `app: gateway tools`

**Task 3.3**: Session Tools
- [x] `packages/application/src/tools/session-send.ts`
- [x] `packages/application/src/tools/session-list.ts`
- [x] `packages/application/src/tools/session-history.ts`
- [x] `packages/application/src/tools/session-select.ts`
- [x] 编写单元测试
- commit: `app: session tools`

**Task 3.4**: Message Tools
- [x] `packages/application/src/tools/message-send-image.ts`
- [x] `packages/application/src/tools/message-delete.ts`
- [x] 编写单元测试
- commit: `app: message tools`

### Phase 4: UI 层

**Task 4.1**: React 应用初始化
- [x] Vite + React + TypeScript 配置
- [x] `apps/web/index.html`
- [x] `apps/web/vite.config.ts`
- [x] `apps/web/tsconfig.json`
- [x] 依赖安装：react, react-dom, react-router-dom
- commit: `ui: init react app`

**Task 4.2**: UI 样式库
- [x] 安装 Vant (移动端组件库)
- [x] 安装 Tailwind CSS
- [x] 配置 tailwind.config.js
- [x] 创建全局样式 `apps/web/src/styles/globals.css`
- commit: `ui: add styling libraries`

**Task 4.3**: DI 容器 + Hooks
- [x] `apps/web/src/di/container.tsx` - React Context DI
- [x] `apps/web/src/hooks/use-agent-tools.ts`
- [x] `apps/web/src/hooks/use-execute-tool.ts`
- [x] `apps/web/src/hooks/use-gateway-status.ts`
- [x] `apps/web/src/hooks/use-session-messages.ts`
- commit: `ui: DI and hooks`

**Task 4.4**: UI 组件 - 基础
- [x] `apps/web/src/components/MessageList.tsx`
- [x] `apps/web/src/components/MessageBubble.tsx`
- [x] `apps/web/src/components/Composer.tsx`
- [x] `apps/web/src/components/ToolCallIndicator.tsx`
- commit: `ui: base components`

**Task 4.5**: UI 组件 - Screens
- [x] `apps/web/src/screens/ChatScreen.tsx`
- [x] `apps/web/src/screens/InstancesScreen.tsx`
- [x] `apps/web/src/screens/SessionSelectScreen.tsx`
- [x] `apps/web/src/screens/SettingsScreen.tsx`
- commit: `ui: screens`

**Task 4.6**: 路由 + 导航
- [x] `apps/web/src/App.tsx` - 主应用组件
- [x] `apps/web/src/router.tsx` - React Router 配置
- [x] `apps/web/src/components/BottomNav.tsx` - 底部导航
- commit: `ui: routing and navigation`

### Phase 5: 集成测试 + 优化

**Task 5.1**: E2E 测试
- [ ] 安装 Playwright
- [ ] `apps/web/e2e/gateway-switch.spec.ts`
- [ ] `apps/web/e2e/message-send.spec.ts`
- [ ] `apps/web/e2e/agent-tool-call.spec.ts`
- commit: `test: e2e tests`

**Task 5.2**: 优化 + 文档
- [x] 性能优化 (代码分割，懒加载)
- [x] 错误处理优化
- [x] `apps/web/README.md` - 开发文档
- [x] `packages/*/README.md` - 包文档
- [x] 更新根 `README.md`
- commit: `docs: add documentation`

---

## 九、验证清单

**开发环境验证**:
- [x] `pnpm install` 成功
- [x] `pnpm -r build` 成功
- [x] `pnpm -r test` 通过
- [ ] `pnpm --dir apps/web dev` 启动成功

**功能验证**:
- [ ] Gateway 添加/切换/删除正常工作
- [ ] Session 列表/历史/发送消息正常工作
- [ ] Agent Tool 调用返回正确结果
- [ ] UI 在移动设备上正常显示

**代码质量验证**:
- [x] `pnpm lint` 通过 (oxlint)
- [x] 类型检查 `pnpm typecheck` 通过
- [x] 测试覆盖率：19 tests, all passing

---

## 十、实施状态

**完成时间**: 2026-03-10

**已完成**:
- ✅ 项目结构初始化
- ✅ 领域层 - 实体、Repository 接口、服务接口、事件、工具类
- ✅ 基础设施层 - WebSocket 连接、Repository 实现、Message Service、存储封装
- ✅ 应用层 - 所有 11 个 Agent Tools、ToolRegistry、DI 容器
- ✅ UI 层 - React 应用、所有组件、Screens、Hooks、路由导航
- ✅ 测试 - 19 个单元测试全部通过
- ✅ 类型检查 - TypeScript 编译通过
- ✅ 构建 - 所有包成功构建
- ✅ 文档 - README 和 IMPLEMENTATION.md

**待完成** (可选增强):
- [ ] E2E 测试 (Playwright)
- [ ] 真实 WebSocket 后端连接
- [ ] PWA 支持
- [ ] 更完善的错误处理
- [ ] 加载状态优化
