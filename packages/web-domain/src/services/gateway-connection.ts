import type { Observable } from "../utils/observable";
import type { Gateway, GatewayError, GatewayStatus } from "../entities";

/**
 * Gateway Connection Service 接口
 */
export interface GatewayConnectionService {
  /**
   * 当前连接状态
   */
  readonly status$: Observable<GatewayStatus>;

  /**
   * 当前错误状态
   */
  readonly error$: Observable<GatewayError | null>;

  /**
   * 当前连接的 Gateway
   */
  readonly currentGateway$: Observable<Gateway | null>;

  /**
   * 配对请求状态
   */
  readonly pairingRequest$: Observable<{ requestId: string; deviceId: string } | null>;

  /**
   * 连接到 Gateway
   */
  connect(gateway: Gateway): Promise<void>;

  /**
   * 断开连接
   */
  disconnect(): Promise<void>;

  /**
   * 重新连接
   */
  reconnect(gatewayId: string): Promise<void>;

  /**
   * 发送 RPC 请求
   */
  request<T>(method: string, params: unknown): Promise<T>;

  /**
   * 注册事件处理器
   */
  on(eventType: string, handler: (payload: unknown) => void): () => void;
}
