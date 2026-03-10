/**
 * Gateway 连接信息（值对象）
 */
export interface Endpoint {
  host: string;
  port: number;
  tls: boolean;
}

/**
 * 设备认证信息（值对象）
 * 支持两种认证模式：
 * 1. Token 认证：deviceId + token（配对批准后使用）
 * 2. 密码认证：deviceId + password（临时连接使用）
 *
 * 设备配对流程：
 * 1. 首次连接时只传 deviceId，不传 token
 * 2. Gateway 返回 "pairing required" 错误
 * 3. 用户在 OpenClaw 端执行 `openclaw devices approve` 批准
 * 4. 批准后获得 token，重新连接
 */
export interface DeviceAuth {
  deviceId: string;
  token?: string;      // 配对批准后获得的 token
  password?: string;   // 密码认证（可选）
  pairingRequestId?: string; // 待处理的配对请求 ID
}

/**
 * Gateway 状态
 */
export type GatewayStatus = "disconnected" | "connecting" | "connected" | "error";

/**
 * Gateway 错误信息
 */
export interface GatewayError {
  code: string;
  message: string;
  at: number;
}

/**
 * Gateway 聚合根
 */
export interface Gateway {
  readonly id: string; // 业务 ID（UUID）
  readonly name: string; // 用户定义名称
  readonly endpoint: Endpoint; // 连接地址
  readonly auth: DeviceAuth; // 认证信息
  status: GatewayStatus;
  connectedAt: number | null;
  error: GatewayError | null;
}
