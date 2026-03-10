import { useState, useEffect } from "react";
import { useDIContainer } from "../di/container";

/**
 * UI Hook: 获取设备配对状态
 *
 * 订阅 connection.pairingRequest$ observable
 * 当 Gateway 返回配对请求时，提供 requestId 和 deviceId 给 UI 显示
 */
export function usePairingStatus() {
  const container = useDIContainer();
  const [pairingRequest, setPairingRequest] = useState<{ requestId: string; deviceId: string } | null>(null);

  useEffect(() => {
    // 订阅配对请求状态变化
    const unsubscribe = container.connection.pairingRequest$.subscribe(setPairingRequest);

    return () => {
      unsubscribe();
    };
  }, [container.connection]);

  return { pairingRequest };
}
