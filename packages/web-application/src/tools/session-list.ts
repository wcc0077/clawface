import { Type } from "@sinclair/typebox";
import type { AppTool } from "./types";
import type { SessionRepository } from "@openclaw/web-domain";

const SessionListSchema = Type.Object({
  gatewayId: Type.Optional(Type.String({ description: "Gateway ID, defaults to current" })),
  limit: Type.Optional(Type.Number({ description: "Max sessions to return", default: 10 })),
});

/**
 * Session List Tool - 列出所有 Sessions
 */
export function createSessionListTool(sessionRepo: SessionRepository): AppTool {
  return {
    name: "session_list",
    description: "List available sessions",
    label: "List Sessions",
    category: "session",
    parameters: SessionListSchema,
    execute: async (_toolCallId, args) => {
      const { gatewayId, limit = 10 } = args as { gatewayId?: string; limit?: number };

      const sessions = await sessionRepo.findAll(gatewayId || "current");

      return {
        success: true,
        sessions: sessions.slice(0, limit).map((s) => ({
          key: s.key,
          displayName: s.displayName,
          messageCount: s.messages.length,
          updatedAt: s.updatedAt,
        })),
      };
    },
  };
}
