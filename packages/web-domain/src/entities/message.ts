/**
 * 消息内容类型
 */
export interface MessageContent {
  type: "text" | "image" | "file";
  text?: string;
  mimeType?: string;
  url?: string;
  base64?: string;
}

/**
 * 工具调用实体
 */
export interface ToolCall {
  toolCallId: string;
  name: string;
  args: Record<string, unknown>;
  status: "pending" | "completed" | "failed";
  result?: string;
  startedAt: number;
  completedAt?: number;
}
