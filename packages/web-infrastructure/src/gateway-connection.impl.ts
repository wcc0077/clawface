import type { Gateway, GatewayError, GatewayStatus } from "@openclaw/web-domain";
import { BehaviorSubject, type Observable } from "@openclaw/web-domain";
import type { GatewayConnectionService } from "@openclaw/web-domain";
import { serializeRequest, deserializeFrame, type RequestFrame } from "./protocol";

/**
 * 从 localStorage 加载或生成设备身份
 * 设备身份包括 deviceId（从公钥派生）和密钥对
 */
type DeviceIdentity = {
  deviceId: string;
  publicKey: string; // Base64Url 编码的原始公钥
  privateKey: string; // Base64Url 编码的 PKCS#8 私钥
};

async function getOrCreateDeviceIdentity(): Promise<DeviceIdentity> {
  const STORAGE_KEY = "openclaw_device_identity";

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as DeviceIdentity;
      if (parsed.deviceId && parsed.publicKey && parsed.privateKey) {
        return parsed;
      }
    }
  } catch {
    // 忽略解析错误，生成新的
  }

  // 生成 Ed25519 密钥对（使用 Web Crypto API）
  // 注意：Ed25519 在 Chrome 113+ 支持
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "Ed25519",
      namedCurve: "Ed25519",
    },
    true,
    ["sign", "verify"],
  );

  // 导出公钥为原始格式
  const publicKeyRaw = await window.crypto.subtle.exportKey("raw", keyPair.publicKey);
  const publicKeyBytes = new Uint8Array(publicKeyRaw);
  let publicKeyBinary = "";
  for (let i = 0; i < publicKeyBytes.byteLength; i++) {
    publicKeyBinary += String.fromCharCode(publicKeyBytes[i]);
  }
  const publicKey = btoa(publicKeyBinary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  // 从公钥派生 deviceId（SHA256 指纹）- 使用连续十六进制格式（无破折号）
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", publicKeyRaw);
  const hashBytes = new Uint8Array(hashBuffer);
  const deviceId = Array.from(hashBytes)
    .map(b => b.toString(16).padStart(2, "0"))
    .join(""); // 连续十六进制，匹配网关格式

  // 导出私钥为 PKCS#8 格式
  const privateKeyPkcs8 = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
  const privateKeyBytes = new Uint8Array(privateKeyPkcs8);
  let privateKeyBinary = "";
  for (let i = 0; i < privateKeyBytes.byteLength; i++) {
    privateKeyBinary += String.fromCharCode(privateKeyBytes[i]);
  }
  const privateKey = btoa(privateKeyBinary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const identity: DeviceIdentity = {
    deviceId,
    publicKey,
    privateKey,
  };

  // 保存到 localStorage
  localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));

  return identity;
}

/**
 * 使用 Ed25519 私钥签名 payload
 */
async function signWithEd25519(privateKeyBase64Url: string, payload: string): Promise<string> {
  // 解码私钥
  const privateKeyBinary = atob(privateKeyBase64Url.replace(/-/g, "+").replace(/_/g, "/"));
  const privateKeyBytes = new Uint8Array(privateKeyBinary.length);
  for (let i = 0; i < privateKeyBinary.length; i++) {
    privateKeyBytes[i] = privateKeyBinary.charCodeAt(i);
  }

  // 导入私钥
  const privateKey = await window.crypto.subtle.importKey(
    "pkcs8",
    privateKeyBytes.buffer,
    { name: "Ed25519", namedCurve: "Ed25519" },
    false,
    ["sign"],
  );

  // 签名
  const encoder = new TextEncoder();
  const signature = await window.crypto.subtle.sign(
    "Ed25519",
    privateKey,
    encoder.encode(payload),
  );

  // 编码签名为 Base64Url
  const signatureBytes = new Uint8Array(signature);
  let signatureBinary = "";
  for (let i = 0; i < signatureBytes.byteLength; i++) {
    signatureBinary += String.fromCharCode(signatureBytes[i]);
  }
  return btoa(signatureBinary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * WebSocket Gateway Connection 实现
 *
 * 设备配对流程：
 * 1. 首次连接：发送 connect 请求，包含设备身份和签名
 * 2. Gateway 验证设备身份，如果未配对则创建配对请求
 * 3. Gateway 返回 NOT_PAIRED 错误，包含 requestId
 * 4. UI 显示配对等待状态
 * 5. 用户执行 `openclaw devices approve` 批准
 * 6. 批准后获得 token，重新连接
 */
export class WebSocketGatewayConnection implements GatewayConnectionService {
  private ws: WebSocket | null = null;
  private currentGateway: Gateway | null = null;
  private eventHandlers = new Map<string, Set<(payload: unknown) => void>>();
  private pendingRequests = new Map<
    string,
    { resolve: (value: unknown) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }
  >();
  private pairingPollTimer: ReturnType<typeof setTimeout> | null = null;

  // 设备身份缓存
  private deviceIdentity: Promise<DeviceIdentity> | null = null;

  private readonly statusSubject = new BehaviorSubject<GatewayStatus>("disconnected");
  private readonly errorSubject = new BehaviorSubject<GatewayError | null>(null);
  private readonly currentGatewaySubject = new BehaviorSubject<Gateway | null>(null);
  private readonly pairingRequestSubject = new BehaviorSubject<{ requestId: string; deviceId: string } | null>(null);

  readonly status$: Observable<GatewayStatus> = this.statusSubject;
  readonly error$: Observable<GatewayError | null> = this.errorSubject;
  readonly currentGateway$: Observable<Gateway | null> = this.currentGatewaySubject;
  readonly pairingRequest$: Observable<{ requestId: string; deviceId: string } | null> = this.pairingRequestSubject;

  /**
   * 获取设备身份（从 localStorage 加载或生成）
   */
  private async getDeviceIdentity(): Promise<DeviceIdentity> {
    if (!this.deviceIdentity) {
      this.deviceIdentity = getOrCreateDeviceIdentity();
    }
    return this.deviceIdentity;
  }

  async connect(gateway: Gateway): Promise<void> {
    this.currentGateway = gateway;
    this.statusSubject.next("connecting");
    this.errorSubject.next(null);

    // 获取设备身份（从 localStorage 加载或生成）
    const identity = await this.getDeviceIdentity();

    const scheme = gateway.endpoint.tls ? "wss" : "ws";
    const url = `${scheme}://${gateway.endpoint.host}:${gateway.endpoint.port}`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        // 等待 connect.challenge 事件，不主动发送 connect
        // 设置超时，如果 5 秒内没有收到 challenge，认为不支持 challenge 流程
        setTimeout(() => {
          if (!this.connectNonce && !this.connectSent) {
            this.doSendConnect(gateway.auth, identity);
          }
        }, 5000);
      };

      this.ws.onmessage = async (event) => {
        const frame = deserializeFrame(event.data);
        if (frame) {
          // 处理 connect.challenge 事件
          if (frame.type === "event" && frame.event === "connect.challenge") {
            await this.handleConnectChallenge(frame.payload as { nonce?: unknown }, gateway.auth, identity);
            return;
          }
          this.handleFrame(frame);
        }
      };

      this.ws.onerror = () => {
        const error: GatewayError = {
          code: "CONNECTION_ERROR",
          message: "Failed to connect to gateway",
          at: Date.now(),
        };
        this.statusSubject.next("error");
        this.errorSubject.next(error);
      };

      this.ws.onclose = (event) => {
        this.statusSubject.next("disconnected");
        this.currentGatewaySubject.next(null);

        // 配对请求关闭码 1008
        if (event.code === 1008) {
          const reason = event.reason || "";
        }
      };

      // Wait for connection to establish (with timeout)
      await this.waitForConnection();
    } catch (error) {
      this.statusSubject.next("error");
      this.errorSubject.next({
        code: "CONNECTION_FAILED",
        message: error instanceof Error ? error.message : "Unknown error",
        at: Date.now(),
      });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.currentGateway = null;
    this.statusSubject.next("disconnected");
    this.currentGatewaySubject.next(null);

    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timer);
      pending.reject(new Error("Connection closed"));
      this.pendingRequests.delete(id);
    }
  }

  async reconnect(gatewayId: string): Promise<void> {
    await this.disconnect();
    if (this.currentGateway && this.currentGateway.id === gatewayId) {
      await this.connect(this.currentGateway);
    }
  }

  async request<T>(method: string, params: unknown): Promise<T> {
    if (!this.ws || this.statusSubject.value !== "connected") {
      throw new Error("Not connected to gateway");
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    return new Promise<T>((resolve, reject) => {
      const frame: RequestFrame = {
        type: "req",
        id,
        method,
        params,
      };

      this.ws?.send(serializeRequest(frame));

      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }, 30000);

      this.pendingRequests.set(id, { resolve: resolve as (value: unknown) => void, reject, timer });
    });
  }

  on(eventType: string, handler: (payload: unknown) => void): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType)!.add(handler);
    return () => {
      this.eventHandlers.get(eventType)?.delete(handler);
    };
  }

  private async waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.statusSubject.value === "connected") {
        resolve();
        return;
      }

      const unsubscribe = this.statusSubject.subscribe((status) => {
        if (status === "connected") {
          unsubscribe();
          resolve();
        } else if (status === "error") {
          unsubscribe();
          reject(new Error("Connection failed"));
        }
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        unsubscribe();
        if (this.statusSubject.value !== "connected") {
          reject(new Error("Connection timeout"));
        }
      }, 10000);
    });
  }

  /**
   * 发送 connect 请求到 Gateway
   * 处理 connect.challenge 事件
   */
  private connectNonce: string | null = null;
  private connectSent = false;

  private async doSendConnect(
    auth: { deviceId: string; token?: string; password?: string },
    identity: DeviceIdentity,
  ): Promise<void> {
    if (this.connectSent) {
      return;
    }
    this.connectSent = true;

    const scopes = ["operator.admin", "operator.approvals", "operator.pairing"];
    const role = "operator";

    const connectParams: any = {
      minProtocol: 3,
      maxProtocol: 3,
      client: {
        id: "openclaw-control-ui",
        version: "0.0.1",
        platform: "web",
        mode: "webchat",
        displayName: "Clawface Web",
      },
      role,
      scopes,
      auth: {} as { token?: string; password?: string },
      userAgent: navigator.userAgent,
      locale: navigator.language,
    };

    // 如果有 token，使用 token 认证
    if (auth.token) {
      connectParams.auth.token = auth.token;
    } else if (auth.password) {
      // 如果有 password，使用 password 认证
      connectParams.auth.password = auth.password;
    }

    // 配对模式或没有 token/password：使用设备身份签名
    if (!auth.token && !auth.password) {
      try {
        const signedAt = Date.now();
        const nonce = this.connectNonce || "";

        // 构建 v3 签名 payload
        const payload = [
          "v3",
          identity.deviceId,
          connectParams.client.id,
          connectParams.client.mode,
          role,
          scopes.join(","),
          String(signedAt),
          "", // token
          nonce,
          connectParams.client.platform,
          "", // deviceFamily
        ].join("|");

        // 使用 Ed25519 签名
        const signature = await signWithEd25519(identity.privateKey, payload);

        connectParams.device = {
          id: identity.deviceId,
          publicKey: identity.publicKey,
          signature,
          signedAt,
          nonce,
        };
      } catch (err) {
        console.error('Failed to generate device identity:', err);
      }
    }

    const id = `${Date.now()}-connect`;
    const frame: RequestFrame = {
      type: "req",
      id,
      method: "connect",
      params: connectParams,
    };

    this.ws?.send(serializeRequest(frame));

    // 等待响应
    const timer = setTimeout(() => {
      this.pendingRequests.delete(id);
    }, 30000);

    this.pendingRequests.set(id, {
      resolve: (value) => {
        clearTimeout(timer);
      },
      reject: (err) => {
        clearTimeout(timer);
        // 配对错误已经在 handleFrame 中处理
      },
      timer
    });
  }

  private async handleConnectChallenge(
    payload: { nonce?: unknown },
    auth: { deviceId: string; token?: string; password?: string },
    identity: DeviceIdentity,
  ): Promise<void> {
    const nonce = payload && typeof payload.nonce === "string" ? payload.nonce : null;
    if (nonce) {
      this.connectNonce = nonce;
      // 使用 nonce 重新发送连接请求
      this.connectSent = false;
      await this.doSendConnect(auth, identity);
    }
  }

  /**
   * 轮询配对请求状态
   * 当配对批准后，自动使用 token 重新连接
   */
  private startPairingPoll(requestId: string, _deviceId: string): void {
    // 清除之前的轮询
    this.stopPairingPoll();

    const poll = async () => {
      try {
        // 使用 device.pair.list 获取配对状态
        const result = await this.request<{ pending: { requestId: string }[]; paired: { deviceId: string; tokens?: Record<string, unknown> }[] }>("device.pair.list", {});

        // 检查配对请求是否已批准
        const approved = result.paired.find((d) => d.tokens && Object.keys(d.tokens).length > 0);

        if (approved) {
          // 配对已批准，停止轮询
          this.stopPairingPoll();

          // 获取 token - 从 approved 设备中获取
          const token = approved.tokens ? Object.values(approved.tokens)[0]?.token : undefined;

          if (token && this.currentGateway) {
            // 更新 gateway 的 token
            const updatedGateway: Gateway = {
              ...this.currentGateway,
              auth: {
                ...this.currentGateway.auth,
                token,
              },
            };

            // 保存更新后的 gateway
            await this.updateCurrentGateway(updatedGateway);

            // 使用 token 重新连接
            this.pairingRequestSubject.next(null);
            this.errorSubject.next({
              code: "PAIRING_APPROVED",
              message: "Device pairing approved. Connecting...",
              at: Date.now(),
            });
            await this.connect(updatedGateway);
          }
        } else {
          // 继续轮询
          this.pairingPollTimer = setTimeout(poll, 2000);
        }
      } catch (error) {
        // 轮询失败，继续尝试
        this.pairingPollTimer = setTimeout(poll, 2000);
      }
    };

    // 2 秒后开始第一次轮询
    this.pairingPollTimer = setTimeout(poll, 2000);
  }

  /**
   * 停止配对轮询
   */
  private stopPairingPoll(): void {
    if (this.pairingPollTimer) {
      clearTimeout(this.pairingPollTimer);
      this.pairingPollTimer = null;
    }
  }

  /**
   * 更新当前 gateway（保存到 repository）
   */
  private async updateCurrentGateway(gateway: Gateway): Promise<void> {
    // 触发 gateway 更新事件，由外部 repository 处理
    this.currentGatewaySubject.next(gateway);
  }

  private handleFrame(frame: any): void {
    // 处理响应帧
    if (frame.type === "res") {
      const pending = this.pendingRequests.get(frame.id);
      if (pending) {
        clearTimeout(pending.timer);
        this.pendingRequests.delete(frame.id);

        // connect.ok 特殊处理：设置连接状态
        if (frame.id.includes('connect') && frame.ok === true) {
          this.statusSubject.next("connected");
          this.currentGatewaySubject.next(this.currentGateway);
        }

        if (frame.ok) {
          pending.resolve(frame.payload);
        } else {
          // connect.error 特殊处理：触发配对流程
          if (frame.id.includes('connect') && frame.error) {
            // NOT_PAIRED, AUTH_REQUIRED 等错误都需要配对
            if (frame.error.code === "NOT_PAIRED" || frame.error.code === "AUTH_REQUIRED" || frame.error.message.includes("pairing") || frame.error.message.includes("identity")) {
              // 提取 requestId（网关在 NOT_PAIRED 响应的 details.requestId 中返回）
              const requestId = (frame.error as any)?.details?.requestId;
              if (requestId) {
                // 广播配对请求到 UI
                this.pairingRequestSubject.next({
                  requestId,
                  deviceId: this.currentGateway?.auth.deviceId || "",
                });
                this.errorSubject.next({
                  code: "PAIRING_REQUIRED",
                  message: `Device pairing required. Please run: openclaw devices approve ${requestId}`,
                  at: Date.now(),
                });
                // 开始轮询配对状态
                this.startPairingPoll(requestId, this.currentGateway?.auth.deviceId || "");
              }
              // reject 以通知调用者连接失败
              pending.reject(new Error(frame.error?.message || "Device identity required"));
              return;
            }
          }
          pending.reject(new Error(frame.error?.message || "Request failed"));
        }
      }
      return;
    }

    // 处理事件帧
    if (frame.type === "event") {
      const handlers = this.eventHandlers.get(frame.event);
      if (handlers) {
        handlers.forEach((handler) => handler(frame.payload));
      }
      return;
    }
  }
}
