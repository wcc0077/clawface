# @openclaw/web-infrastructure

OpenClaw Web Infrastructure Layer - Implementation details.

## Exports

- `./connection` - WebSocketGatewayConnection implementation
- `./repositories` - LocalStorageGatewayRepository, IndexedDBSessionRepository
- `./message-service` - WebSocketMessageService
- `./storage` - IDBDatabase, LocalStorage utilities

## Usage

```typescript
import {
  WebSocketGatewayConnection,
  LocalStorageGatewayRepository,
  IndexedDBSessionRepository,
  WebSocketMessageService,
} from "@openclaw/web-infrastructure";
```

## License

MIT
