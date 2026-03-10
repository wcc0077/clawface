import { NavBar, List } from "antd-mobile";
import { useGatewayStatus } from "../hooks";
import "./SettingsScreen.css";

function SettingsScreen() {
  const { currentGateway, status } = useGatewayStatus();

  return (
    <div className="settings-screen">
      <NavBar back={null}>Settings</NavBar>
      <div className="settings-content">
        <List>
          <List.Item title="Gateway" extra={currentGateway?.name || "Not connected"} />
          <List.Item title="Status" extra={status || "unknown"} />
          {currentGateway && (
            <>
              <List.Item title="Host" extra={`${currentGateway.endpoint.host}:${currentGateway.endpoint.port}`} />
              <List.Item title="Gateway ID" extra={currentGateway.id} />
            </>
          )}
        </List>

        <div style={{ padding: '16px 16px 8px', fontWeight: 'bold', color: '#666' }}>About</div>
        <List>
          <List.Item title="Version" extra="0.0.1" />
          <List.Item title="Build" extra={new Date().toISOString().split("T")[0]} />
        </List>
      </div>
    </div>
  );
}

export default SettingsScreen;
