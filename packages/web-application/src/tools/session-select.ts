import { Type } from "@sinclair/typebox";
import type { AppTool } from "./types";
import type { SessionRepository } from "@openclaw/web-domain";

const SessionSelectSchema = Type.Object({
  sessionId: Type.String({ description: "Session key to select" }),
});

/**
 * Session Select Tool - 选择当前 Session
 */
export function createSessionSelectTool(sessionRepo: SessionRepository): AppTool {
  return {
    name: "session_select",
    description: "Select a session as the current active session",
    label: "Select Session",
    category: "session",
    parameters: SessionSelectSchema,
    execute: async (_toolCallId, args) => {
      const { sessionId } = args as { sessionId: string };

      const session = await sessionRepo.findByKey(parseSessionKey(sessionId));
      if (!session) {
        return { success: false, error: "Session not found" };
      }

      // 在 localStorage 中记录当前选中的 session
      localStorage.setItem("openclaw:currentSession", sessionId);

      return {
        success: true,
        session: {
          key: session.key,
          displayName: session.displayName,
          messageCount: session.messages.length,
        },
      };
    },
  };
}

function parseSessionKey(key: string): { gatewayId: string; agentId: string; channelId: string } {
  const parts = key.split(":");
  if (parts.length === 3) {
    return {
      gatewayId: parts[0],
      agentId: parts[1],
      channelId: parts[2],
    };
  }
  throw new Error(`Invalid session key format: ${key}`);
}
