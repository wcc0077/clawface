import { Type } from "@sinclair/typebox";
import type { AppTool } from "./types";
import type { GatewayRepository, GatewayConnectionService } from "@openclaw/web-domain";

const GatewayDeleteSchema = Type.Object({
  gatewayId: Type.String({ description: "Gateway ID to delete" }),
});

/**
 * Gateway Delete Tool - 删除 Gateway
 */
export function createGatewayDeleteTool(
  gatewayRepo: GatewayRepository,
  connection: GatewayConnectionService
): AppTool {
  return {
    name: "gateway_delete",
    description: "Delete a Gateway instance",
    label: "Gateway Delete",
    category: "gateway",
    parameters: GatewayDeleteSchema,
    execute: async (_toolCallId, args) => {
      const { gatewayId } = args as { gatewayId: string };

      const gateway = await gatewayRepo.findById(gatewayId);
      if (!gateway) {
        return { success: false, error: `Gateway '${gatewayId}' not found` };
      }

      // 如果正在连接，先断开
      if (gateway.status === "connected") {
        await connection.disconnect();
      }

      await gatewayRepo.delete(gatewayId);

      return {
        success: true,
        message: `Gateway '${gateway.name}' deleted successfully`,
      };
    },
  };
}
