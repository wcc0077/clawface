import type { Message } from "@openclaw/web-domain";
import "./MessageBubble.css";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const roleLabels: Record<string, string> = {
    user: "You",
    assistant: "Assistant",
    system: "System",
  };

  const textContent = message.content.find((c) => c.type === "text")?.text || "";
  const hasImage = message.content.some((c) => c.type === "image");

  return (
    <div className={`message-bubble ${isOwn ? "own" : "other"}`}>
      <div className="message-role">{roleLabels[message.role]}</div>
      <div className="message-content">
        {hasImage && (
          <div className="message-image">
            {message.content
              .filter((c) => c.type === "image")
              .map((img, idx) => (
                <img key={idx} src={img.url || img.base64} alt="Shared image" />
              ))}
          </div>
        )}
        {textContent && <div className="message-text">{textContent}</div>}
      </div>
      <div className="message-time">
        {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </div>
    </div>
  );
}

export default MessageBubble;
