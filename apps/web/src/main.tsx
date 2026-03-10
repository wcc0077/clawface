import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { DIProvider } from "./di/container";
import App from "./App";
import "./styles/globals.css";

// 创建 DI 容器
import { createDIContainer } from "@openclaw/web-application";
import {
  LocalStorageGatewayRepository,
  IndexedDBSessionRepository,
  WebSocketGatewayConnection,
  WebSocketMessageService,
} from "@openclaw/web-infrastructure";

const gatewayRepo = new LocalStorageGatewayRepository();
const sessionRepo = new IndexedDBSessionRepository();
const connection = new WebSocketGatewayConnection();

// 设置 Session Repository 到 Connection，用于自动保存接收到的消息
connection.setSessionRepository(sessionRepo);

const messageService = new WebSocketMessageService(
  (method, params) => connection.request(method, params)
);

const container = createDIContainer(gatewayRepo, sessionRepo, connection, messageService);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <DIProvider container={container}>
      <HashRouter>
        <App />
      </HashRouter>
    </DIProvider>
  </React.StrictMode>
);
