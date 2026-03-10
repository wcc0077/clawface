import { useState, useEffect } from "react";
import { useDIContainer } from "../di/container";

/**
 * UI Hook: 获取 AI 响应状态
 */
export function useAIResponding() {
  const container = useDIContainer();
  const [isResponding, setIsResponding] = useState(false);

  useEffect(() => {
    const unsubscribe = container.connection.aiResponding$.subscribe(setIsResponding);

    return () => {
      unsubscribe();
    };
  }, [container.connection]);

  return { isResponding };
}
