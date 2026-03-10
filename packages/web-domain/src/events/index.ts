import type { GatewayError, SessionKey } from "../entities";

/**
 * 领域事件基类
 */
export interface DomainEvent {
  type: string;
  timestamp: number;
  aggregateId: string;
}

/**
 * Gateway 已连接事件
 */
export interface GatewayConnectedEvent extends DomainEvent {
  type: "GatewayConnected";
  gatewayId: string;
}

/**
 * Gateway 已断开事件
 */
export interface GatewayDisconnectedEvent extends DomainEvent {
  type: "GatewayDisconnected";
  gatewayId: string;
}

/**
 * Gateway 错误事件
 */
export interface GatewayErrorEvent extends DomainEvent {
  type: "GatewayError";
  gatewayId: string;
  error: GatewayError;
}

/**
 * 消息已发送事件
 */
export interface MessageSentEvent extends DomainEvent {
  type: "MessageSent";
  sessionId: SessionKey;
  messageId: string;
  role: string;
}

/**
 * 消息已接收事件
 */
export interface MessageReceivedEvent extends DomainEvent {
  type: "MessageReceived";
  sessionId: SessionKey;
  messageId: string;
  content: string;
}

/**
 * Session 已创建事件
 */
export interface SessionCreatedEvent extends DomainEvent {
  type: "SessionCreated";
  sessionId: SessionKey;
  gatewayId: string;
}

/**
 * 所有领域事件的联合类型
 */
export type AppDomainEvent =
  | GatewayConnectedEvent
  | GatewayDisconnectedEvent
  | GatewayErrorEvent
  | MessageSentEvent
  | MessageReceivedEvent
  | SessionCreatedEvent;
