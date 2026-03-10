import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ToolRegistry } from "./registry";
import type { AppTool } from "./types";

describe("ToolRegistry", () => {
  it("should register and get tools", () => {
    const registry = new ToolRegistry();
    const mockTool: AppTool = {
      name: "test_tool",
      description: "A test tool",
      label: "Test",
      category: "gateway",
      parameters: {} as any,
      execute: async () => ({ success: true }),
    };

    registry.register(mockTool);
    expect(registry.get("test_tool")).toBeDefined();
    expect(registry.get("nonexistent")).toBeUndefined();
  });

  it("should list all tools", () => {
    const registry = new ToolRegistry();
    registry.register({
      name: "tool1",
      description: "Tool 1",
      label: "Tool 1",
      category: "gateway",
      parameters: {} as any,
      execute: async () => ({}),
    } as AppTool);
    registry.register({
      name: "tool2",
      description: "Tool 2",
      label: "Tool 2",
      category: "session",
      parameters: {} as any,
      execute: async () => ({}),
    } as AppTool);

    expect(registry.list().length).toBe(2);
  });

  it("should filter tools by category", () => {
    const registry = new ToolRegistry();
    registry.register({
      name: "gateway_tool",
      description: "Gateway Tool",
      label: "Gateway",
      category: "gateway",
      parameters: {} as any,
      execute: async () => ({}),
    } as AppTool);
    registry.register({
      name: "session_tool",
      description: "Session Tool",
      label: "Session",
      category: "session",
      parameters: {} as any,
      execute: async () => ({}),
    } as AppTool);

    const gatewayTools = registry.list("gateway");
    expect(gatewayTools.length).toBe(1);
    expect(gatewayTools[0].name).toBe("gateway_tool");
  });

  it("should execute tools", async () => {
    const registry = new ToolRegistry();
    let callArgs: { toolCallId: string; args: Record<string, unknown> } | null = null;

    registry.register({
      name: "exec_tool",
      description: "Execute Tool",
      label: "Execute",
      category: "gateway",
      parameters: {} as any,
      execute: async (toolCallId: string, args: Record<string, unknown>) => {
        callArgs = { toolCallId, args };
        return { result: "test" };
      },
    } as AppTool);

    const tool = registry.get("exec_tool");
    const result = await tool?.execute("call-1", { param: "value" });

    expect(result).toEqual({ result: "test" });
    expect(callArgs).toEqual({ toolCallId: "call-1", args: { param: "value" } });
  });
});
