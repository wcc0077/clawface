import { useState, useEffect } from "react";
import { NavBar, List, Button, Dialog, Input, Selector, Toast } from "antd-mobile";
import { useGatewayStatus, useExecuteTool, usePairingStatus } from "../hooks";
import { PairingPending } from "../components/PairingPending";
import type { Gateway } from "@openclaw/web-domain";
import "./InstancesScreen.css";

function InstancesScreen() {
  const executeTool = useExecuteTool();
  const { currentGateway, error } = useGatewayStatus();
  const { pairingRequest } = usePairingStatus();
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [authMode, setAuthMode] = useState<"token" | "password" | "pairing">("pairing");
  const [newGateway, setNewGateway] = useState({
    name: "Gateway-" + Math.random().toString(36).substring(2, 6).toUpperCase(),
    host: "43.133.10.4",
    port: "443",
    tls: true,
    token: "",
    password: "",
  });

  // 监听配对批准后的连接成功消息
  useEffect(() => {
    if (error?.code === "PAIRING_APPROVED") {
      Toast.show({
        content: "Device paired successfully!",
        duration: 3000,
      });
    }
  }, [error]);

  const loadGateways = async () => {
    setLoading(true);
    try {
      const result: unknown = await executeTool("gateway_list", {});
      if ((result as { success: boolean }).success) {
        setGateways((result as { gateways: Gateway[] }).gateways);
      }
    } catch (error) {
      console.error("Failed to load gateways:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGateways();
  }, []);

  const handleSwitch = async (gatewayId: string) => {
    try {
      const result: unknown = await executeTool("gateway_switch", { gatewayId });
      const resultObj = result as { success: boolean; gatewayName: string; error?: string };
      if (resultObj.success) {
        console.log(`Switched to ${resultObj.gatewayName}`);
      } else {
        console.error(resultObj.error || "Unknown error");
      }
    } catch (error) {
      console.error("Failed to switch gateway:", error);
    }
  };

  const getStatusLabel = (status: Gateway["status"]) => {
    const labels: Record<string, string> = {
      disconnected: "Disconnected",
      connecting: "Connecting",
      connected: "Connected",
      error: "Error",
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: Gateway["status"]) => {
    const colors: Record<string, string> = {
      disconnected: "#999",
      connecting: "#1890ff",
      connected: "#52c41a",
      error: "#ff4d4f",
    };
    return colors[status] || "#999";
  };

  const handleDelete = async (gateway: Gateway) => {
    const confirmed = await Dialog.confirm({
      title: "Confirm Delete",
      content: `Are you sure you want to delete gateway "${gateway.name}"?`,
    });
    if (confirmed) {
      try {
        const result: unknown = await executeTool("gateway_delete", { gatewayId: gateway.id });
        const resultObj = result as { success: boolean; error?: string };
        if (resultObj.success) {
          console.log("Gateway deleted");
          loadGateways();
        } else {
          console.error(resultObj.error || "Unknown error");
        }
      } catch (error) {
        console.error("Failed to delete gateway:", error);
      }
    }
  };

  const handleAddGateway = async () => {
    console.log('[DEBUG] handleAddGateway called', { newGateway, authMode });

    try {
      const result: unknown = await executeTool("gateway_add", {
        name: newGateway.name,
        host: newGateway.host,
        port: parseInt(newGateway.port),
        tls: newGateway.tls,
        token: authMode === "token" ? newGateway.token : undefined,
        password: authMode === "password" ? newGateway.password : undefined,
        // pairing 模式不需要传凭证，首次连接会自动触发配对流程
      });
      console.log('[DEBUG] gateway_add result', result);
      const resultObj = result as { success: boolean; error?: string };
      if (resultObj.success) {
        Toast.show({
          content: authMode === "pairing"
            ? "Gateway added. Please approve the device pairing request on OpenClaw."
            : "Gateway added successfully",
          duration: 3000,
        });
        setShowAddModal(false);
        setNewGateway({
          name: "Gateway-" + Math.random().toString(36).substring(2, 6).toUpperCase(),
          host: "43.133.10.4",
          port: "443",
          tls: true,
          token: "",
          password: ""
        });
        loadGateways();
      } else {
        console.error(resultObj.error || "Unknown error");
        Toast.show({ content: resultObj.error || "Failed to add gateway", icon: "fail" });
      }
    } catch (error) {
      console.error("Failed to add gateway:", error);
      Toast.show({ content: "Failed to add gateway", icon: "fail" });
    }
  };

  return (
    <div className="instances-screen">
      <NavBar back={null} right={
        <Button size="small" onClick={(e) => { e.stopPropagation(); setShowAddModal(true); }}>Add</Button>
      }>
        Instances
      </NavBar>

      {/* 配对等待状态显示 */}
      {pairingRequest && pairingRequest.requestId && (
        <PairingPending requestId={pairingRequest.requestId} />
      )}

      <List>
        {gateways.length === 0 && !loading && (
          <div style={{ padding: '16px', textAlign: 'center', color: '#999' }}>No gateways configured</div>
        )}
        {loading && (
          <div style={{ padding: '16px', textAlign: 'center' }}>Loading...</div>
        )}
        {gateways.map((gw) => (
          <List.Item
            key={gw.id}
            title={gw.name}
            description={`${gw.endpoint.host}:${gw.endpoint.port}`}
            extra={
              <div className="gateway-actions">
                <span className={`status`} style={{ color: getStatusColor(gw.status) }}>
                  {gw.connectedAt
                    ? `${getStatusLabel(gw.status)} ${gw.connectedAt ? '(' + new Date(gw.connectedAt).toLocaleTimeString() + ')' : ''}`
                    : getStatusLabel(gw.status)
                  }
                </span>
                {currentGateway?.id !== gw.id && (
                  <Button color="primary" size="mini" onClick={() => handleSwitch(gw.id)}>
                    Switch
                  </Button>
                )}
                <Button color="danger" size="mini" fill="none" onClick={() => handleDelete(gw)}>
                  Delete
                </Button>
              </div>
            }
          />
        ))}
      </List>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Gateway</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <div className="add-gateway-form">
              <Input
                placeholder="Name"
                value={newGateway.name}
                onChange={(val) => setNewGateway({ ...newGateway, name: val })}
              />
              <Input
                placeholder="Host (IP or domain)"
                value={newGateway.host}
                onChange={(val) => setNewGateway({ ...newGateway, host: val })}
              />
              <Input
                placeholder="Port"
                value={newGateway.port}
                onChange={(val) => setNewGateway({ ...newGateway, port: val })}
                type="number"
              />
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>TLS (WSS)</label>
                <Selector
                  options={[
                    { label: 'Off', value: 'false' },
                    { label: 'On', value: 'true' },
                  ]}
                  value={[newGateway.tls ? 'true' : 'false']}
                  onChange={(value) => {
                    if (value.length > 0) {
                      setNewGateway({ ...newGateway, tls: value[0] === 'true' });
                    }
                  }}
                  style={{ '--gap': '8px' }}
                  multiple={false}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Auth Mode</label>
                <Selector
                  options={[
                    { label: 'Pairing', value: 'pairing' },
                    { label: 'Token', value: 'token' },
                    { label: 'Password', value: 'password' },
                  ]}
                  value={[authMode]}
                  onChange={(value) => {
                    if (value.length > 0) {
                      setAuthMode(value[0] as "token" | "password" | "pairing");
                    }
                  }}
                  style={{ '--gap': '8px' }}
                  multiple={false}
                />
              </div>
              {authMode === "token" && (
                <Input
                  placeholder="Token (from openclaw devices rotate)"
                  value={newGateway.token}
                  onChange={(val) => setNewGateway({ ...newGateway, token: val })}
                  type="password"
                />
              )}
              {authMode === "password" && (
                <Input
                  placeholder="Password"
                  value={newGateway.password}
                  onChange={(val) => setNewGateway({ ...newGateway, password: val })}
                  type="password"
                />
              )}
              {authMode === "pairing" && (
                <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '8px' }}>
                  <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                    <strong>Device Pairing Mode</strong>
                  </p>
                  <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#999' }}>
                    1. Click Add to create a pairing request<br/>
                    2. On OpenClaw, run: <code>openclaw devices approve</code><br/>
                    3. After approval, the gateway will connect automatically
                  </p>
                </div>
              )}
            </div>
            <div className="modal-actions">
              <Button onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button color="primary" onClick={handleAddGateway}>Add</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InstancesScreen;
