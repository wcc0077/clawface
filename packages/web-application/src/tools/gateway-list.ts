import { Type } from "@sinclair/typebox";
import type { AppTool } from "./types";
import type { GatewayRepository } from "@openclaw/web-domain";

const GatewayListSchema = Type.Object({});

/**
 * Gateway List Tool - 列出所有 Gateway
 */
export function createGatewayListTool(gatewayRepo: GatewayRepository): AppTool {
  return {
    name: "gateway_list",
    description: "List all available Gateway instances",
    label: "Gateway List",
    category: "gateway",
    parameters: GatewayListSchema,
    execute: async () => {
      const gateways = await gatewayRepo.findAll();

      return {
        success: true,
        gateways: gateways.map((g) => ({
          id: g.id,
          name: g.name,
          status: g.status,
          endpoint: `${g.endpoint.host}:${g.endpoint.port}`,
          connectedAt: g.connectedAt,
        })),
      };
    },
  };
}
