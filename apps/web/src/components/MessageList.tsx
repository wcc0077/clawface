import { useRef, useEffect } from "react";
import MessageBubble from "./MessageBubble";
import ToolCallIndicator from "./ToolCallIndicator";
import type { Message, ToolCall } from "@openclaw/web-domain";
import "./MessageList.css";

interface MessageListProps {
  messages: Message[];
  pendingToolCalls?: ToolCall[];
  currentGatewayId?: string;
}

function MessageList({ messages, pendingToolCalls = [] }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, pendingToolCalls]);

  const isOwn = (role: string) => role === "user";

  return (
    <div className="message-list" ref={containerRef}>
      {messages.length === 0 ? (
        <div className="message-list-empty">
          <p>No messages yet</p>
          <p>Start a conversation!</p>
        </div>
      ) : (
        messages.map((message) => (
          <MessageBubble key={message.id} message={message} isOwn={isOwn(message.role)} />
        ))
      )}
      {pendingToolCalls.map((toolCall) => (
        <ToolCallIndicator key={toolCall.toolCallId} toolCall={toolCall} />
      ))}
    </div>
  );
}

export default MessageList;
