import type { TSchema } from "@sinclair/typebox";

/**
 * Agent Tool 接口（简化版本，不依赖外部 SDK）
 */
export interface AgentTool<TResult> {
  name: string;
  description: string;
  label: string;
  parameters: TSchema;
  execute: (toolCallId: string, args: Record<string, unknown>) => Promise<TResult>;
}

/**
 * 应用层 Tool 类型
 */
export type AppTool = AgentTool<unknown> & {
  ownerOnly?: boolean;
  category: "gateway" | "session" | "message" | "instance";
};
