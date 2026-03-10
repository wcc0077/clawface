import { Type } from "@sinclair/typebox";
import type { AppTool } from "./types";
import type { SessionRepository, MessageService, Message, Session } from "@openclaw/web-domain";
import { generateId, parseSessionKey } from "@openclaw/web-domain";

const SessionSendSchema = Type.Object({
  text: Type.String({ description: "Message text to send" }),
  sessionId: Type.Optional(Type.String({ description: "Session key, defaults to current" })),
});

/**
 * 发送消息的辅助函数
 */
async function sendMessage(
  messageService: MessageService,
  sessionRepo: SessionRepository,
  session: Session,
  text: string
): Promise<{ success: boolean; messageId: string; timestamp: number }> {
  console.log('[session-send] Calling messageService.sendText:', { sessionKey: session.key, text });

  // 先保存用户消息到本地（乐观更新）
  const userMessage: Message = {
    id: generateId(),
    sessionId: session.key,
    role: 'user',
    content: [{ type: 'text', text }],
    timestamp: Date.now(),
  };

  try {
    if ((sessionRepo as any).addMessage) {
      await (sessionRepo as any).addMessage(session.key, userMessage);
      console.log('[session-send] User message saved to repository (optimistic)');
    }
  } catch (err) {
    console.error('[session-send] Failed to save user message locally:', err);
  }

  try {
    await messageService.sendText(session, text);
    console.log('[session-send] Message sent successfully');
  } catch (err) {
    console.error('[session-send] Failed to send message:', err);
    throw err;
  }

  return {
    success: true,
    messageId: userMessage.id,
    timestamp: Date.now(),
  };
}

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
    execute: async (toolCallId, args) => {
      const { text, sessionId } = args as { text: string; sessionId?: string };

      console.log('[session_send] Called with:', { text, sessionId, toolCallId });

      // 获取当前会话
      const sessionKey = sessionId ? parseSessionKey(sessionId) : { gatewayId: "current", agentId: "current", channelId: "current" };
      console.log('[session_send] Looking for session:', sessionKey);

      try {
        console.log('[session_send] Before findByKey...');
        const session = await sessionRepo.findByKey(sessionKey);
        console.log('[session_send] After findByKey, found session:', session);

        if (!session) {
          console.error('[session_send] Session not found, creating new session automatically');
          // 自动创建新 Session
          const newSession: Session = {
            key: sessionKey,
            gatewayId: sessionKey.gatewayId,
            displayName: null,
            status: 'active',
            messages: [],
            pendingToolCalls: [],
            updatedAt: Date.now(),
          };
          console.log('[session_send] About to save new session...');
          await sessionRepo.save(newSession);
          console.log('[session_send] New session created:', newSession);
          // 重新获取 session
          const fetchedSession = await sessionRepo.findByKey(sessionKey);
          console.log('[session_send] Re-fetched session:', fetchedSession);
          // 继续发送消息
          if (!fetchedSession) {
            throw new Error('Failed to fetch newly created session');
          }
          // 继续执行发送消息逻辑
          return await sendMessage(messageService, sessionRepo, fetchedSession, text);
        }

        // 发送消息
        return await sendMessage(messageService, sessionRepo, session, text);
      } catch (err) {
        console.error('[session_send] Error:', err);
        throw err;
      }
    },
  };
}
