import type { MessageService, Session } from "@openclaw/web-domain";

/**
 * Message Service 实现
 */
export class WebSocketMessageService implements MessageService {
  private requestFn: <T>(method: string, params: unknown) => Promise<T>;

  constructor(requestFn: <T>(method: string, params: unknown) => Promise<T>) {
    this.requestFn = requestFn;
  }

  async sendText(session: Session, text: string): Promise<void> {
    console.log('[WebSocketMessageService] Sending text message:', {
      sessionId: session.key,
      text
    });

    try {
      // 调用网关的 chat.send 方法
      const result = await this.requestFn<{ messageId: string }>("chat.send", {
        sessionKey: typeof session.key === "string" ? session.key : `${session.key.gatewayId}:${session.key.agentId}:${session.key.channelId}`,
        message: text,
      });
      console.log('[WebSocketMessageService] Message sent successfully:', result);
    } catch (err) {
      console.error('[WebSocketMessageService] Failed to send message:', err);
      throw err;
    }
  }

  async sendImage(session: Session, url: string, mimeType?: string): Promise<void> {
    await this.requestFn("chat.send", {
      sessionKey: typeof session.key === "string" ? session.key : `${session.key.gatewayId}:${session.key.agentId}:${session.key.channelId}`,
      message: "",
      attachments: [{
        type: "image",
        url,
        mimeType: mimeType || "image/jpeg",
      }],
    });
  }

  async streamReply(
    session: Session,
    onChunk: (text: string) => void,
    onComplete: () => void,
    onError: (error: Error) => void
  ): Promise<void> {
    try {
      // Request streaming reply
      const streamId = await this.requestFn<string>("chat.send", {
        sessionKey: typeof session.key === "string" ? session.key : `${session.key.gatewayId}:${session.key.agentId}:${session.key.channelId}`,
        message: "",
        stream: true,
      });

      // Subscribe to stream events
      const unsubscribe = await this.requestFn<() => void>("subscribeStream", {
        streamId,
        onChunk: (chunk: string) => {
          onChunk(chunk);
        },
      });

      // Wait for stream completion
      await this.requestFn("waitForStream", { streamId });

      unsubscribe?.();
      onComplete();
    } catch (error) {
      onError(error instanceof Error ? error : new Error("Stream failed"));
    }
  }
}
