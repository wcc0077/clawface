/**
 * 生成唯一的 ID
 */
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * 生成设备 ID
 */
export function generateDeviceId(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    // Node.js fallback
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("-");
}

/**
 * 解析 Session Key 字符串
 */
export function parseSessionKey(key: string): { gatewayId: string; agentId: string; channelId: string } {
  const parts = key.split(":");
  if (parts.length === 3) {
    return {
      gatewayId: parts[0],
      agentId: parts[1],
      channelId: parts[2],
    };
  }
  // 特殊值：current 表示当前会话
  if (key === "current") {
    return { gatewayId: "current", agentId: "current", channelId: "current" };
  }
  throw new Error(`Invalid session key format: ${key}`);
}

/**
 * 序列化 Session Key
 */
export function serializeSessionKey(key: { gatewayId: string; agentId: string; channelId: string }): string {
  return `${key.gatewayId}:${key.agentId}:${key.channelId}`;
}
