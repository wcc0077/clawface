import { Routes, Route, Navigate } from "react-router-dom";
import ChatScreen from "./screens/ChatScreen";
import InstancesScreen from "./screens/InstancesScreen";
import SessionSelectScreen from "./screens/SessionSelectScreen";
import SettingsScreen from "./screens/SettingsScreen";
import BottomNav from "./components/BottomNav";

function App() {
  return (
    <div className="app">
      <div className="app-content">
        <Routes>
          <Route path="/" element={<Navigate to="/chat" replace />} />
          <Route path="/chat" element={<ChatScreen />} />
          <Route path="/instances" element={<InstancesScreen />} />
          <Route path="/sessions" element={<SessionSelectScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
        </Routes>
      </div>
      <div className="bottom-nav">
        <BottomNav />
      </div>
    </div>
  );
}

export default App;
