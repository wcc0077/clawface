import { useState, useEffect, useRef } from "react";
import { NavBar, PullToRefresh, Button } from "antd-mobile";
import BubbleList from "@ant-design/x/es/bubble/BubbleList";
import Sender from "@ant-design/x/es/sender";
import type { SenderProps } from "@ant-design/x/es/sender";
import type { BubbleListProps } from "@ant-design/x/es/bubble/interface";
import { useSessionMessages, useExecuteTool, useGatewayStatus } from "../hooks";
import type { SessionKey, Message } from "@openclaw/web-domain";
import "./ChatScreen.css";

function ChatScreen() {
  const executeTool = useExecuteTool();
  const { currentGateway } = useGatewayStatus();
  const [currentSessionKey, setCurrentSessionKey] = useState<SessionKey | null>(null);
  const [sending, setSending] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const { messages, loading } = useSessionMessages(currentSessionKey);

  const handleSend: SenderProps["onSubmit"] = async (data) => {
    if (!currentSessionKey) return;
    setSending(true);

    const text = typeof data === "string" ? data : (data as { text?: string }).text || "";
    if (!text.trim()) {
      setSending(false);
      return;
    }

    try {
      await executeTool("session_send", {
        text: text.trim(),
        sessionId: serializeSessionKey(currentSessionKey)
      });
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setSending(false);
    }
  };

  const handleRefresh = async () => {
    // Reload messages
  };

  const handleNewSession = async () => {
    try {
      // 创建新会话
      const result: unknown = await executeTool("session_list", { limit: 1 });
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

  // Convert messages to Bubble items
  const bubbleItems: BubbleListProps["items"] = messages.map((msg: Message) => ({
    key: msg.id,
    role: msg.role === "user" ? "user" : "ai",
    placement: msg.role === "user" ? "end" : "start",
    content: msg.content.find((c) => c.type === "text")?.text || "",
    avatar: msg.role === "user" ? null : <div style={{ background: "#1890ff", color: "#fff", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>AI</div>,
  }));

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
        <div style={{ height: "calc(100vh - 140px)", overflow: "auto" }}>
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
      />
    </div>
  );
}

function serializeSessionKey(key: SessionKey): string {
  return `${key.gatewayId}:${key.agentId}:${key.channelId}`;
}

export default ChatScreen;
