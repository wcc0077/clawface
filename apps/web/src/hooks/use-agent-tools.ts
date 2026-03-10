import { useState, useEffect, useCallback } from "react";
import type { AppTool } from "@openclaw/web-application";
import { useDIContainer } from "../di/container";

/**
 * UI Hook: 获取可用的 Agent Tools
 */
export function useAgentTools(): AppTool[] {
  const container = useDIContainer();
  const [tools, setTools] = useState<AppTool[]>([]);

  useEffect(() => {
    const registry = container.toolRegistry;
    setTools(registry.toAgentTools());
  }, [container.toolRegistry]);

  return tools;
}

/**
 * UI Hook: 执行 Tool
 */
export function useExecuteTool() {
  const container = useDIContainer();

  const execute = useCallback(
    async (toolName: string, args: Record<string, unknown>) => {
      const tool = container.toolRegistry.get(toolName);
      if (!tool) {
        throw new Error(`Tool '${toolName}' not found`);
      }

      const toolCallId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const result = await tool.execute(toolCallId, args);
      return result;
    },
    [container.toolRegistry]
  );

  return execute;
}
