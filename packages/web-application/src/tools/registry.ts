import type { AppTool } from "./types";

/**
 * Tool Registry - 注册和管理所有 Agent Tools
 */
export class ToolRegistry {
  private tools = new Map<string, AppTool>();

  /**
   * 注册一个 Tool
   */
  register(tool: AppTool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * 获取一个 Tool
   */
  get(name: string): AppTool | undefined {
    return this.tools.get(name);
  }

  /**
   * 列出所有 Tools
   */
  list(category?: string): AppTool[] {
    const all = Array.from(this.tools.values());
    return category ? all.filter((t) => t.category === category) : all;
  }

  /**
   * 获取所有可用的 Agent Tools
   */
  toAgentTools(): AppTool[] {
    return this.list();
  }
}
