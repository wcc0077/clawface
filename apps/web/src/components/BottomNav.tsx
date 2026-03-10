import { useLocation, useNavigate } from "react-router-dom";
import { TabBar } from "antd-mobile";
import { MessageOutline, UnorderedListOutline, AppstoreOutline, SetOutline } from "antd-mobile-icons";
import "./BottomNav.css";

function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = location.pathname.replace("/", "") || "chat";

  return (
    <div className="bottom-nav">
      <TabBar activeKey={activeTab} onChange={(name) => navigate(`/${name}`)}>
        <TabBar.Item key="chat" title="Chat" icon={<MessageOutline />} />
        <TabBar.Item key="sessions" title="Sessions" icon={<UnorderedListOutline />} />
        <TabBar.Item key="instances" title="Instances" icon={<AppstoreOutline />} />
        <TabBar.Item key="settings" title="Settings" icon={<SetOutline />} />
      </TabBar>
    </div>
  );
}

export default BottomNav;
