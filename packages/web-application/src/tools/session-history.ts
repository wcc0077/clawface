import { Type } from "@sinclair/typebox";
import type { AppTool } from "./types";
import type { SessionRepository } from "@openclaw/web-domain";
import { parseSessionKey } from "@openclaw/web-domain";

const SessionHistorySchema = Type.Object({
  sessionId: Type.String({ description: "Session key" }),
  limit: Type.Optional(Type.Number({ description: "Max messages to return", default: 20 })),
});

/**
 * Session History Tool - 获取 Session 消息历史
 */
export function createSessionHistoryTool(sessionRepo: SessionRepository): AppTool {
  return {
    name: "session_history",
    description: "Get message history for a session",
    label: "Session History",
    category: "session",
    parameters: SessionHistorySchema,
    execute: async (_toolCallId, args) => {
      const { sessionId, limit = 20 } = args as { sessionId: string; limit?: number };

      const session = await sessionRepo.findByKey(parseSessionKey(sessionId));
      if (!session) {
        return { success: false, error: "Session not found" };
      }

      return {
        success: true,
        messages: session.messages.slice(-limit).map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content.find((c) => c.type === "text")?.text || "",
          timestamp: m.timestamp,
        })),
      };
    },
  };
}
