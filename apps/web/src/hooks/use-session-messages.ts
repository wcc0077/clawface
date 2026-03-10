import { useState, useEffect, useRef } from "react";
import { useDIContainer } from "../di/container";
import type { Message, SessionKey } from "@openclaw/web-domain";

/**
 * UI Hook: 获取 Session 消息
 */
export function useSessionMessages(sessionKey: SessionKey | null, onFirstAIResponse?: () => void) {
  const container = useDIContainer();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const hasReceivedAIResponse = useRef(false);

  useEffect(() => {
    if (!sessionKey) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    hasReceivedAIResponse.current = false;

    // 订阅消息变化
    const unsubscribe = container.sessionRepo.observeMessages(sessionKey).subscribe((newMessages: Message[]) => {
      setMessages(newMessages);
      setLoading(false);

      // Detect first AI response after user sent a message
      const hasAIMessage = newMessages.some(msg => msg.role === "assistant");
      if (hasAIMessage && !hasReceivedAIResponse.current && onFirstAIResponse) {
        hasReceivedAIResponse.current = true;
        onFirstAIResponse();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [sessionKey, container.sessionRepo, onFirstAIResponse]);

  return { messages, loading };
}
