import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { NavBar, PullToRefresh, Button } from "antd-mobile";
import BubbleList from "@ant-design/x/es/bubble/BubbleList";
import Sender from "@ant-design/x/es/sender";
import type { SenderProps } from "@ant-design/x/es/sender";
import type { BubbleListProps } from "@ant-design/x/es/bubble/interface";
import { XMarkdown } from "@ant-design/x-markdown";
import SyntaxHighlighter from "react-syntax-highlighter";
import { atelierHeathLight } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { useSessionMessages, useExecuteTool, useGatewayStatus } from "../hooks";
import type { SessionKey, Message } from "@openclaw/web-domain";
import { serializeSessionKey } from "@openclaw/web-domain";
import "katex/dist/katex.min.css";
import "./ChatScreen.css";

// AI avatar component
const AI_AVATAR = (
  <div style={{ background: "#1890ff", color: "#fff", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>
    AI
  </div>
);

function ChatScreen() {
  const executeTool = useExecuteTool();
  const { currentGateway } = useGatewayStatus();
  const [currentSessionKey, setCurrentSessionKey] = useState<SessionKey | null>(null);
  const [sending, setSending] = useState(false);
  const [autoClear, setAutoClear] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const bubbleListRef = useRef<HTMLDivElement>(null);
  const lastMessageCount = useRef(0);

  // Load current session from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("openclaw:currentSession");
    if (stored) {
      const parts = stored.split(":");
      if (parts.length === 3) {
        setCurrentSessionKey({
          gatewayId: parts[0],
          agentId: parts[1],
          channelId: parts[2],
        });
      }
    }
  }, []);

  const handleStopThinking = useCallback(() => {
    setIsThinking(false);
  }, []);

  const { messages, loading } = useSessionMessages(currentSessionKey, handleStopThinking);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    const scrollToBottom = () => {
      requestAnimationFrame(() => {
        if (bubbleListRef.current) {
          bubbleListRef.current.scrollTop = bubbleListRef.current.scrollHeight;
        }
      });
    };

    // Scroll when new messages arrive
    if (messages.length > lastMessageCount.current) {
      scrollToBottom();
    }
    lastMessageCount.current = messages.length;
  }, [messages.length]);

  const handleSend: SenderProps["onSubmit"] = async (data) => {
    if (!currentSessionKey) {
      console.warn('[ChatScreen] No session key, cannot send message');
      alert('No session selected. Please create or select a session first.');
      return;
    }

    const text = typeof data === "string" ? data : (data as { text?: string }).text || "";

    if (!text.trim()) {
      return;
    }

    setSending(true);
    setIsThinking(true);

    try {
      await executeTool("session_send", {
        text: text.trim(),
        sessionId: serializeSessionKey(currentSessionKey)
      });
      // Clear input after successful send
      setAutoClear(prev => !prev);
    } catch (error) {
      console.error("[ChatScreen] Failed to send message:", error);
      alert(`Failed to send message: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSending(false);
      // Don't hide thinking state immediately - wait for AI response
      // setIsThinking(false);
    }
  };

  const handleRefresh = async () => {
    // Reload messages
  };

  const handleNewSession = async () => {
    try {
      // 创建新会话
      await executeTool("session_list", { limit: 1 });
      // 默认使用第一个 agent 和 channel
      const newSessionKey: SessionKey = {
        gatewayId: currentGateway!.id,
        agentId: "default",
        channelId: "default",
      };
      const sessionKeyStr = serializeSessionKey(newSessionKey);
      localStorage.setItem("openclaw:currentSession", sessionKeyStr);
      setCurrentSessionKey(newSessionKey);
    } catch (error) {
      console.error("Failed to create new session:", error);
    }
  };

  // Custom renderer for AI messages with Markdown support
  const renderAIContent = useCallback((content: string) => (
    <XMarkdown
      components={{
        code: (props: any) => {
          // Handle inline code
          if (!props.className) {
            return (
              <code
                {...props}
                style={{
                  background: 'rgba(0, 0, 0, 0.05)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '0.9em',
                }}
              />
            );
          }
          // Handle code blocks with syntax highlighting
          const language = props.className?.replace('language-', '') || 'text';
          return (
            <SyntaxHighlighter
              {...props}
              style={atelierHeathLight}
              language={language}
              showLineNumbers
              wrapLines
              customStyle={{
                borderRadius: '8px',
                fontSize: '13px',
                marginTop: '8px',
                marginBottom: '8px',
              }}
            />
          );
        },
      }}
    >
      {content}
    </XMarkdown>
  ), []);

  // Convert messages to Bubble items - memoized for performance
  const bubbleItems: BubbleListProps["items"] = useMemo(() => [
    ...messages.map((msg: Message) => {
      const textContent = msg.content.find((c) => c.type === "text")?.text || "";
      const isAI = msg.role === "assistant";

      return {
        key: msg.id,
        role: msg.role === "user" ? "user" : "ai",
        placement: msg.role === "user" ? ("end" as const) : ("start" as const),
        content: isAI ? renderAIContent(textContent) : textContent,
        avatar: msg.role === "user" ? null : AI_AVATAR,
      };
    }),
    // Add thinking indicator when AI is processing
    ...(isThinking && !loading ? [{
      key: 'thinking',
      role: 'ai' as const,
      placement: 'start' as const,
      content: (
        <div className="thinking-indicator">
          <span className="thinking-dot"></span>
          <span className="thinking-dot"></span>
          <span className="thinking-dot"></span>
        </div>
      ),
      avatar: AI_AVATAR,
    }] : []),
  ], [messages, isThinking, loading, renderAIContent]);

  if (!currentGateway) {
    return (
      <div className="chat-screen">
        <NavBar back={null}>Chat</NavBar>
        <div className="chat-screen-empty">
          <p>No gateway connected</p>
          <p>Go to Instances to add a gateway</p>
        </div>
      </div>
    );
  }

  if (!currentSessionKey) {
    return (
      <div className="chat-screen">
        <NavBar back={null}>{currentGateway.name || "Chat"}</NavBar>
        <div className="chat-screen-empty">
          <p>No session selected</p>
          <Button color="primary" onClick={handleNewSession}>
            New Session
          </Button>
          <p style={{ marginTop: 16, fontSize: 14 }}>
            Or go to Sessions to select an existing session
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-screen" ref={containerRef}>
      <NavBar back={null}>{currentGateway?.name || "Chat"}</NavBar>
      <PullToRefresh onRefresh={handleRefresh}>
        <div
          ref={bubbleListRef}
          style={{ height: "calc(100vh - 140px)", overflow: "auto" }}
        >
          {loading ? (
            <div className="loading">Loading messages...</div>
          ) : (
            <BubbleList
              items={bubbleItems}
              style={{ maxWidth: "100%" }}
              role={{
                user: { placement: "end", avatar: null },
                ai: { placement: "start" },
              }}
            />
          )}
        </div>
      </PullToRefresh>
      <Sender
        onSubmit={handleSend}
        placeholder="Type a message..."
        loading={sending}
        key={autoClear ? "cleared" : "normal"}
      />
    </div>
  );
}

export default ChatScreen;
