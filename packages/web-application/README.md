# @openclaw/web-application

OpenClaw Web Application Layer - Agent Tools and Use Cases.

## Exports

- `./tools` - Agent Tool factories and registry
- `./container` - DI Container

## Available Tools

### Gateway Tools
- `createGatewaySwitchTool` - Switch Gateway
- `createGatewayAddTool` - Add Gateway
- `createGatewayStatusTool` - Get Gateway status
- `createGatewayListTool` - List Gateways
- `createGatewayDeleteTool` - Delete Gateway

### Session Tools
- `createSessionSendTool` - Send message
- `createSessionListTool` - List sessions
- `createSessionHistoryTool` - Get session history
- `createSessionSelectTool` - Select session

### Message Tools
- `createMessageSendImageTool` - Send image
- `createMessageDeleteTool` - Delete message

## Usage

```typescript
import { createDIContainer, ToolRegistry } from "@openclaw/web-application";
import { useAgentTools, useExecuteTool } from "@openclaw/web-application";
```

## License

MIT
