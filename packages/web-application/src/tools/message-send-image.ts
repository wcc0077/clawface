import { Type } from "@sinclair/typebox";
import type { AppTool } from "./types";
import type { SessionRepository, MessageService } from "@openclaw/web-domain";
import { parseSessionKey } from "@openclaw/web-domain";

const MessageSendImageSchema = Type.Object({
  imageUrl: Type.String({ description: "URL of the image to send" }),
  sessionId: Type.Optional(Type.String({ description: "Session key, defaults to current" })),
  mimeType: Type.Optional(Type.String({ description: "Image MIME type", default: "image/jpeg" })),
});

/**
 * Message Send Image Tool - 发送图片消息
 */
export function createMessageSendImageTool(
  sessionRepo: SessionRepository,
  messageService: MessageService
): AppTool {
  return {
    name: "message_send_image",
    description: "Send an image message to a session",
    label: "Send Image",
    category: "message",
    parameters: MessageSendImageSchema,
    execute: async (_toolCallId, args) => {
      const { imageUrl, sessionId, mimeType } = args as {
        imageUrl: string;
        sessionId?: string;
        mimeType?: string;
      };

      const session = await sessionRepo.findByKey(
        sessionId ? parseSessionKey(sessionId) : { gatewayId: "current", agentId: "current", channelId: "current" }
      );
      if (!session) {
        return { success: false, error: "Session not found" };
      }

      await messageService.sendImage(session, imageUrl, mimeType);

      return {
        success: true,
        imageUrl,
        timestamp: Date.now(),
      };
    },
  };
}
