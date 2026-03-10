# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OpenClaw Web is a mobile-first web application with Domain-Driven Design (DDD) architecture and AI agent support. Built with React 19, TypeScript, Vite, and antd-mobile.

## Commands

```bash
pnpm dev          # Start dev server (apps/web on port 3000)
pnpm build        # Build all packages
pnpm test         # Run tests with Vitest
pnpm lint         # Lint with oxlint
pnpm typecheck    # TypeScript type check
```

### Run single test file
```bash
pnpm vitest run packages/web-domain/src/utils/id-generator.test.ts
```

### Run tests in watch mode
```bash
pnpm test:watch   # Or: pnpm vitest (in specific package)
```

## Architecture

### Monorepo Structure (pnpm workspaces)

```
apps/
  web/              # React UI layer (antd-mobile + Tailwind)
packages/
  web-domain/       # Domain layer - entities, repositories, services
  web-application/  # Application layer - agent tools, use cases
  web-infrastructure # Infrastructure - implementations, storage
```

### Layer Dependencies

```
apps/web → @openclaw/web-application → @openclaw/web-domain
                              ↓
@openclaw/web-infrastructure → @openclaw/web-domain
```

### Domain Layer (`packages/web-domain`)

Core business logic - **no external dependencies**:
- **Entities**: Gateway, Session, Message, ToolCall
- **Repositories**: GatewayRepository, SessionRepository (interfaces)
- **Services**: GatewayConnection, MessageService (interfaces)
- **Events**: GatewayConnected, GatewayDisconnected, MessageSent
- **Utils**: ID generator, Observable/BehaviorSubject

### Infrastructure Layer (`packages/web-infrastructure`)

Implementation details:
- `WebSocketGatewayConnection` - WebSocket-based gateway connection
- `LocalStorageGatewayRepository` - localStorage persistence
- `IndexedDBSessionRepository` - IndexedDB for sessions
- `WebSocketMessageService` - message sending

### Application Layer (`packages/web-application`)

Agent tools and DI container:
- **11 Agent Tools**: gateway_switch, gateway_add, gateway_status, gateway_list, gateway_delete, session_send, session_list, session_history, session_select, message_send_image, message_delete
- `ToolRegistry` - tool management and execution
- DI container for service resolution

### UI Layer (`apps/web`)

React components:
- **Screens**: ChatScreen, InstancesScreen, SessionSelectScreen, SettingsScreen
- **Components**: MessageList, MessageBubble, Composer, ToolCallIndicator, BottomNav
- **Hooks**: useAgentTools, useExecuteTool, useGatewayStatus, useSessionMessages

## Key Patterns

- **Domain events** use BehaviorSubject for reactive state
- **Repository pattern** abstracts persistence (interface in domain, impl in infrastructure)
- **Tool definitions** use TypeBox for schema validation
- **DI container** in `packages/web-application/src/container.ts` resolves layer dependencies

## Testing

- Vitest configured per-package
- Test files: `*.test.ts` alongside source
- Domain: 9 tests (utils)
- Application: 4 tests (ToolRegistry)
- Infrastructure: 6 tests (storage)
