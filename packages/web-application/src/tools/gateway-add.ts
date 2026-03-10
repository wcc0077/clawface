import { Type } from "@sinclair/typebox";
import type { AppTool } from "./types";
import type { GatewayRepository, Gateway, GatewayConnectionService } from "@openclaw/web-domain";
import { generateId, generateDeviceId } from "@openclaw/web-domain";

const GatewayAddSchema = Type.Object({
  name: Type.String({ description: "Gateway name (e.g., '家里', '公司')" }),
  host: Type.String({ description: "Gateway host (IP or domain)" }),
  port: Type.Number({ description: "Gateway port (default: 18789)" }),
  tls: Type.Optional(Type.Boolean({ description: "Use WSS instead of WS" })),
  token: Type.Optional(Type.String({ description: "Gateway auth token (for token mode)" })),
  password: Type.Optional(Type.String({ description: "Gateway password (for password mode)" })),
});

/**
 * Gateway Add Tool - 添加新的 Gateway
 */
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
    execute: async (_toolCallId, args) => {
      const { name, host, port, tls, token, password } = args as {
        name: string;
        host: string;
        port: number;
        tls?: boolean;
        token?: string;
        password?: string;
      };

      const gateway: Gateway = {
        id: generateId(),
        name,
        endpoint: { host, port: port || 18789, tls: tls || false },
        auth: {
          deviceId: generateDeviceId(),
          token,
          password,
        },
        status: "disconnected",
        connectedAt: null,
        error: null,
      };

      await gatewayRepo.save(gateway);

      // 新添加的 gateway，自动尝试连接
      try {
        await connection.connect(gateway);
      } catch (err) {
        // 连接失败会触发配对流程，由 UI 显示
        console.log('[DEBUG] Initial connection failed, pairing flow may be triggered');
      }

      return {
        success: true,
        gatewayId: gateway.id,
        message: `Gateway '${name}' added successfully`,
      };
    },
  };
}
