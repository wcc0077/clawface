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
      const sessionKey = typeof session.key === "string"
        ? session.key
        : `${session.key.gatewayId}:${session.key.agentId}:${session.key.channelId}`;

      console.log('[WebSocketMessageService] Calling connection.request with method=chat.send, sessionKey=', sessionKey);

      // 生成 idempotency key
      const idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      // 调用网关的 chat.send 方法
      const result = await this.requestFn<{ messageId: string }>("chat.send", {
        idempotencyKey,
        sessionKey,
        message: text,
      });
      console.log('[WebSocketMessageService] Message sent successfully:', result);
    } catch (err) {
      console.error('[WebSocketMessageService] Failed to send message:', err);
      throw err;
    }
  }

  async sendImage(session: Session, url: string, mimeType?: string): Promise<void> {
    const sessionKey = typeof session.key === "string"
      ? session.key
      : `${session.key.gatewayId}:${session.key.agentId}:${session.key.channelId}`;

    const idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    await this.requestFn("chat.send", {
      idempotencyKey,
      sessionKey,
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
    _onChunk: (text: string) => void,
    onComplete: () => void,
    onError: (error: Error) => void
  ): Promise<void> {
    try {
      // 调用 chat.send 发送空消息，请求流式响应
      const sessionKey = typeof session.key === "string"
        ? session.key
        : `${session.key.gatewayId}:${session.key.agentId}:${session.key.channelId}`;

      // 注意：当前实现中，流式响应通过 chat.message 事件推送
      // 外部需要订阅 connection 的 chat.message 事件来处理流式消息
      console.log('[WebSocketMessageService] streamReply called - streaming not fully implemented, use chat.message events instead');

      // TODO: 实现完整的流式响应需要：
      // 1. 在 WebSocketGatewayConnection 中跟踪 streamId
      // 2. 订阅 chat.message 事件并过滤出对应 streamId 的消息
      // 3. 累积消息内容并调用 onChunk

      // 临时实现：发送一个空消息，依靠后端推送 chat.message 事件
      await this.requestFn("chat.send", {
        sessionKey,
        message: "", // 空消息触发回复
      });

      // 由于无法等待流完成，直接调用 onComplete
      // 实际的流式内容通过 chat.message 事件处理
      onComplete();
    } catch (error) {
      onError(error instanceof Error ? error : new Error("Stream failed"));
    }
  }
}
