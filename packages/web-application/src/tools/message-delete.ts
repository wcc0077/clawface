import { Type } from "@sinclair/typebox";
import type { AppTool } from "./types";
import type { SessionRepository } from "@openclaw/web-domain";
import { parseSessionKey } from "@openclaw/web-domain";

const MessageDeleteSchema = Type.Object({
  messageId: Type.String({ description: "Message ID to delete" }),
  sessionId: Type.String({ description: "Session key" }),
});

/**
 * Message Delete Tool - 删除消息
 */
export function createMessageDeleteTool(sessionRepo: SessionRepository): AppTool {
  return {
    name: "message_delete",
    description: "Delete a message from a session",
    label: "Delete Message",
    category: "message",
    parameters: MessageDeleteSchema,
    execute: async (_toolCallId, args) => {
      const { messageId, sessionId } = args as { messageId: string; sessionId: string };

      const session = await sessionRepo.findByKey(parseSessionKey(sessionId));
      if (!session) {
        return { success: false, error: "Session not found" };
      }

      const messageIndex = session.messages.findIndex((m) => m.id === messageId);
      if (messageIndex === -1) {
        return { success: false, error: "Message not found" };
      }

      session.messages.splice(messageIndex, 1);
      session.updatedAt = Date.now();
      await sessionRepo.save(session);

      return {
        success: true,
        messageId,
      };
    },
  };
}
