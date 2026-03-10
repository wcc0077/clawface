import { useState, useEffect } from "react";
import { useDIContainer } from "../di/container";
import type { GatewayStatus, Gateway } from "@openclaw/web-domain";

/**
 * UI Hook: 获取 Gateway 状态
 */
export function useGatewayStatus() {
  const container = useDIContainer();
  const [status, setStatus] = useState<GatewayStatus>("disconnected");
  const [currentGateway, setCurrentGateway] = useState<Gateway | null>(null);
  const [error, setError] = useState<{ code: string; message: string; at: number } | null>(null);

  useEffect(() => {
    // 订阅状态变化
    const unsubscribeStatus = container.connection.status$.subscribe(setStatus);
    const unsubscribeGateway = container.connection.currentGateway$.subscribe(setCurrentGateway);
    const unsubscribeError = container.connection.error$.subscribe(setError);

    return () => {
      unsubscribeStatus();
      unsubscribeGateway();
      unsubscribeError();
    };
  }, [container.connection]);

  return { status, currentGateway, error };
}
