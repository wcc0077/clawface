import { useState, useEffect } from "react";
import { NavBar, List, PullToRefresh } from "antd-mobile";
import { useNavigate } from "react-router-dom";
import { useExecuteTool } from "../hooks";
import type { Session } from "@openclaw/web-domain";
import "./SessionSelectScreen.css";

function SessionSelectScreen() {
  const navigate = useNavigate();
  const executeTool = useExecuteTool();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const result: unknown = await executeTool("session_list", { limit: 50 });
      if ((result as { success: boolean }).success) {
        setSessions((result as { sessions: Session[] }).sessions);
      }
    } catch (error) {
      console.error("Failed to load sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleRefresh = async () => {
    await loadSessions();
  };

  const handleSelectSession = async (session: Session) => {
    try {
      const sessionKey = typeof session.key === "string" ? session.key : `${session.key.gatewayId}:${session.key.agentId}:${session.key.channelId}`;
      await executeTool("session_select", { sessionId: sessionKey });
      navigate("/chat");
    } catch (error) {
      console.error("Failed to select session:", error);
    }
  };

  return (
    <div className="session-select-screen">
      <NavBar back={null}>Sessions</NavBar>
      <PullToRefresh onRefresh={handleRefresh}>
        <List>
          {sessions.length === 0 && !loading && (
            <div style={{ padding: '16px', textAlign: 'center', color: '#999' }}>No sessions</div>
          )}
          {loading && (
            <div style={{ padding: '16px', textAlign: 'center' }}>Loading...</div>
          )}
          {sessions.map((session, index) => (
            <List.Item
              key={index}
              title={session.displayName || `Session ${index + 1}`}
              clickable
              onClick={() => handleSelectSession(session)}
            />
          ))}
        </List>
      </PullToRefresh>
    </div>
  );
}

export default SessionSelectScreen;
