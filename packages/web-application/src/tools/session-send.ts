import { Type } from "@sinclair/typebox";
import type { AppTool } from "./types";
import type { SessionRepository, MessageService } from "@openclaw/web-domain";
import { generateId, parseSessionKey } from "@openclaw/web-domain";

const SessionSendSchema = Type.Object({
  text: Type.String({ description: "Message text to send" }),
  sessionId: Type.Optional(Type.String({ description: "Session key, defaults to current" })),
});

/**
 * Session Send Tool - 发送消息
 */
export function createSessionSendTool(
  sessionRepo: SessionRepository,
  messageService: MessageService
): AppTool {
  return {
    name: "session_send",
    description: "Send a message to the current or specified session",
    label: "Send Message",
    category: "session",
    parameters: SessionSendSchema,
    execute: async (_toolCallId, args) => {
      const { text, sessionId } = args as { text: string; sessionId?: string };

      console.log('[session_send] Called with:', { text, sessionId });

      // 获取当前会话
      const sessionKey = sessionId ? parseSessionKey(sessionId) : { gatewayId: "current", agentId: "current", channelId: "current" };
      console.log('[session_send] Looking for session:', sessionKey);

      const session = await sessionRepo.findByKey(sessionKey);
      console.log('[session_send] Found session:', session);

      if (!session) {
        console.error('[session_send] Session not found');
        return { success: false, error: "Session not found" };
      }

      // 发送消息
      console.log('[session-send] Sending message to session:', session.key);
      try {
        await messageService.sendText(session, text);
        console.log('[session-send] Message sent successfully');
      } catch (err) {
        console.error('[session-send] Failed to send message:', err);
        throw err;
      }

      return {
        success: true,
        messageId: generateId(),
        timestamp: Date.now(),
      };
    },
  };
}
