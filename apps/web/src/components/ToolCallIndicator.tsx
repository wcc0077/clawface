import type { ToolCall } from "@openclaw/web-domain";
import "./ToolCallIndicator.css";

interface ToolCallIndicatorProps {
  toolCall: ToolCall;
}

function ToolCallIndicator({ toolCall }: ToolCallIndicatorProps) {
  const statusIcons: Record<string, string> = {
    pending: "⏳",
    completed: "✅",
    failed: "❌",
  };

  return (
    <div className="tool-call-indicator">
      <span className="status-icon">{statusIcons[toolCall.status]}</span>
      <span className="tool-name">{toolCall.name}</span>
      {toolCall.status === "pending" && <span className="loading">Executing...</span>}
      {toolCall.status === "completed" && toolCall.result && (
        <span className="result">{toolCall.result}</span>
      )}
      {toolCall.status === "failed" && <span className="error">Failed</span>}
    </div>
  );
}

export default ToolCallIndicator;
