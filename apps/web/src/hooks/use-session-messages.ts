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
  const lastMessageId = useRef<string | null>(null);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!sessionKey) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    hasInitialized.current = false;
    lastMessageId.current = null;

    // 订阅消息变化
    const unsubscribe = container.sessionRepo.observeMessages(sessionKey).subscribe((newMessages: Message[]) => {
      setMessages(newMessages);
      setLoading(false);

      // 初始化时记录最后一条消息 ID，不触发回调
      if (!hasInitialized.current) {
        hasInitialized.current = true;
        const lastMsg = newMessages[newMessages.length - 1];
        if (lastMsg) {
          lastMessageId.current = lastMsg.id;
        }
        return;
      }

      // 检测新的 AI 消息
      const lastMsg = newMessages[newMessages.length - 1];
      if (lastMsg && lastMsg.role === "assistant" && lastMsg.id !== lastMessageId.current) {
        lastMessageId.current = lastMsg.id;
        if (onFirstAIResponse) {
          onFirstAIResponse();
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [sessionKey, container.sessionRepo, onFirstAIResponse]);

  return { messages, loading };
}
