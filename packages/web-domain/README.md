# @openclaw/web-domain

OpenClaw Web Domain Layer - Core business entities and interfaces.

## Exports

- `./entities` - Gateway, Session, Message entities
- `./repositories` - GatewayRepository, SessionRepository interfaces
- `./services` - GatewayConnectionService, MessageService interfaces
- `./events` - Domain events
- `./utils` - Utility functions (ID generation, Observable)

## Usage

```typescript
import { Gateway, Session, Message } from "@openclaw/web-domain/entities";
import { GatewayRepository, SessionRepository } from "@openclaw/web-domain/repositories";
import { GatewayConnectionService, MessageService } from "@openclaw/web-domain/services";
```

## License

MIT
