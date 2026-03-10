import { Type } from "@sinclair/typebox";
import type { AppTool } from "./types";
import type { GatewayRepository, GatewayConnectionService } from "@openclaw/web-domain";

const GatewayStatusSchema = Type.Object({
  gatewayId: Type.Optional(Type.String({ description: "Gateway ID, defaults to current" })),
});

/**
 * Gateway Status Tool - 获取 Gateway 状态
 */
export function createGatewayStatusTool(
  gatewayRepo: GatewayRepository,
  _connection: GatewayConnectionService
): AppTool {
  return {
    name: "gateway_status",
    description: "Get the status of a Gateway instance",
    label: "Gateway Status",
    category: "gateway",
    parameters: GatewayStatusSchema,
    execute: async (_toolCallId, args) => {
      const { gatewayId } = args as { gatewayId?: string };

      const gateways = await gatewayRepo.findAll();
      const target = gatewayId
        ? gateways.find((g) => g.id === gatewayId || g.name === gatewayId)
        : gateways.find((g) => g.status === "connected");

      if (!target) {
        return { success: false, error: "Gateway not found" };
      }

      return {
        success: true,
        gateway: {
          id: target.id,
          name: target.name,
          status: target.status,
          endpoint: `${target.endpoint.host}:${target.endpoint.port}`,
          connectedAt: target.connectedAt,
        },
      };
    },
  };
}
