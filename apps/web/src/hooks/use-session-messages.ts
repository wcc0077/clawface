import { useState, useEffect } from "react";
import { useDIContainer } from "../di/container";
import type { Message, SessionKey } from "@openclaw/web-domain";

/**
 * UI Hook: 获取 Session 消息
 */
export function useSessionMessages(sessionKey: SessionKey | null) {
  const container = useDIContainer();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionKey) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // 订阅消息变化
    const unsubscribe = container.sessionRepo.observeMessages(sessionKey).subscribe((newMessages: Message[]) => {
      setMessages(newMessages);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [sessionKey, container.sessionRepo]);

  return { messages, loading };
}
