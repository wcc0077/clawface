import { Type } from "@sinclair/typebox";
import type { AppTool } from "./types";
import type { GatewayRepository, GatewayConnectionService } from "@openclaw/web-domain";

const GatewaySwitchSchema = Type.Object({
  gatewayId: Type.String({
    description: "Gateway ID or name (e.g., 'home', 'work')",
  }),
});

/**
 * Gateway Switch Tool - 切换到指定的 Gateway
 */
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
    execute: async (_toolCallId, args) => {
      const { gatewayId } = args as { gatewayId: string };

      // 1. 获取 Gateway
      const gateway = await gatewayRepo.findById(gatewayId);
      if (!gateway) {
        return { success: false, error: `Gateway '${gatewayId}' not found` };
      }

      // 2. 断开当前连接
      await connection.disconnect();

      // 3. 建立新连接
      await connection.connect(gateway);

      return {
        success: true,
        gatewayId: gateway.id,
        gatewayName: gateway.name,
        endpoint: `${gateway.endpoint.host}:${gateway.endpoint.port}`,
      };
    },
  };
}
