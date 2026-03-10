import { Button, Toast } from "antd-mobile";
import "./PairingPending.css";

interface PairingPendingProps {
  requestId: string;
  onCopy?: () => void;
}

/**
 * 配对等待组件
 *
 * 显示配对请求 ID 和批准命令说明
 * 当用户执行 `openclaw devices approve` 后，由父组件检测并自动重连
 */
export function PairingPending({ requestId, onCopy }: PairingPendingProps) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(requestId);
      Toast.show({
        content: "Request ID copied",
        duration: 2000,
      });
      onCopy?.();
    } catch (err) {
      console.error("Failed to copy request ID:", err);
    }
  };

  const handleCopyCommand = async () => {
    try {
      await navigator.clipboard.writeText(`openclaw devices approve ${requestId}`);
      Toast.show({
        content: "Command copied",
        duration: 2000,
      });
    } catch (err) {
      console.error("Failed to copy command:", err);
    }
  };

  return (
    <div className="pairing-pending">
      <div className="pairing-pending-icon">🔐</div>
      <h3>Device Pairing Required</h3>
      <p className="pairing-pending-description">
        This device needs to be approved by OpenClaw before it can connect.
      </p>

      <div className="pairing-pending-section">
        <label>Request ID:</label>
        <div className="pairing-pending-code">
          <code>{requestId}</code>
          <Button size="mini" fill="none" onClick={handleCopy}>
            Copy
          </Button>
        </div>
      </div>

      <div className="pairing-pending-section">
        <label>Approve Command:</label>
        <div className="pairing-pending-command">
          <pre>openclaw devices approve {requestId}</pre>
          <Button size="mini" fill="none" onClick={handleCopyCommand}>
            Copy
          </Button>
        </div>
      </div>

      <div className="pairing-pending-steps">
        <h4>Steps:</h4>
        <ol>
          <li>Copy the command above</li>
          <li>Run it on your OpenClaw terminal</li>
          <li>Wait for approval - connection will be established automatically</li>
        </ol>
      </div>

      <div className="pairing-pending-status">
        <Button loading color="primary">
          Waiting for approval...
        </Button>
      </div>
    </div>
  );
}
