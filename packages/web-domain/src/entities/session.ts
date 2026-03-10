import type { MessageContent, ToolCall } from "./message";

/**
 * Session 键（值对象）
 */
export interface SessionKey {
  gatewayId: string;
  agentId: string;
  channelId: string;
}

/**
 * Session 状态
 */
export type SessionStatus = "active" | "idle" | "archived";

/**
 * 消息实体
 */
export interface Message {
  id: string;
  sessionId: SessionKey;
  role: "user" | "assistant" | "system";
  content: MessageContent[];
  timestamp: number;
}

/**
 * Session 聚合根
 */
export interface Session {
  readonly key: SessionKey;
  gatewayId: string;
  displayName: string | null;
  status: SessionStatus;
  messages: Message[];
  pendingToolCalls: ToolCall[];
  updatedAt: number;
}

export type { MessageContent, ToolCall };
