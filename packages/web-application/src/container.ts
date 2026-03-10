import type {
  GatewayRepository,
  SessionRepository,
  GatewayConnectionService,
  MessageService,
} from "@openclaw/web-domain";
import { ToolRegistry } from "./tools/registry";
import type { AppTool } from "./tools/types";
import {
  createGatewaySwitchTool,
  createGatewayAddTool,
  createGatewayStatusTool,
  createGatewayListTool,
  createGatewayDeleteTool,
  createSessionSendTool,
  createSessionListTool,
  createSessionHistoryTool,
  createSessionSelectTool,
  createMessageSendImageTool,
  createMessageDeleteTool,
} from "./tools/all-tools";

/**
 * 依赖注入容器
 */
export interface DIContainer {
  gatewayRepo: GatewayRepository;
  sessionRepo: SessionRepository;
  connection: GatewayConnectionService;
  messageService: MessageService;
  toolRegistry: ToolRegistry;
}

/**
 * 创建 DI 容器
 */
export function createDIContainer(
  gatewayRepo: GatewayRepository,
  sessionRepo: SessionRepository,
  connection: GatewayConnectionService,
  messageService: MessageService
): DIContainer {
  const toolRegistry = new ToolRegistry();

  // 注册所有 Tools
  const allTools: AppTool[] = [
    // Gateway Tools
    createGatewaySwitchTool(gatewayRepo, connection),
    createGatewayAddTool(gatewayRepo, connection),
    createGatewayStatusTool(gatewayRepo, connection),
    createGatewayListTool(gatewayRepo),
    createGatewayDeleteTool(gatewayRepo, connection),
    // Session Tools
    createSessionSendTool(sessionRepo, messageService),
    createSessionListTool(sessionRepo),
    createSessionHistoryTool(sessionRepo),
    createSessionSelectTool(sessionRepo),
    // Message Tools
    createMessageSendImageTool(sessionRepo, messageService),
    createMessageDeleteTool(sessionRepo),
  ];

  allTools.forEach((tool) => toolRegistry.register(tool));

  return {
    gatewayRepo,
    sessionRepo,
    connection,
    messageService,
    toolRegistry,
  };
}
