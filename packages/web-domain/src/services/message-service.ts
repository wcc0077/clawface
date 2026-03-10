import type { Session } from "../entities";

/**
 * Message Service 接口
 */
export interface MessageService {
  /**
   * 发送文本消息
   */
  sendText(session: Session, text: string): Promise<void>;

  /**
   * 发送图片消息
   */
  sendImage(session: Session, url: string, mimeType?: string): Promise<void>;

  /**
   * 流式回复
   */
  streamReply(
    session: Session,
    onChunk: (text: string) => void,
    onComplete: () => void,
    onError: (error: Error) => void
  ): Promise<void>;
}
