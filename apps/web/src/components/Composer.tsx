import { useState } from "react";
import { TextArea, Button } from "antd-mobile";
import "./Composer.css";

interface ComposerProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

function Composer({ onSend, disabled }: ComposerProps) {
  const [value, setValue] = useState("");

  const handleSend = () => {
    if (value.trim() && !disabled) {
      onSend(value.trim());
      setValue("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="composer">
      <TextArea
        value={value}
        onChange={setValue}
        onKeyDown={handleKeyPress}
        placeholder="Type a message..."
        disabled={disabled}
        autoSize={{ minRows: 1, maxRows: 4 }}
        className="composer-input"
      />
      <Button color="primary" size="small" onClick={handleSend} disabled={disabled || !value.trim()}>
        Send
      </Button>
    </div>
  );
}

export default Composer;
