/**
 * RPC 协议帧格式
 */
export interface RequestFrame {
  type: "req";
  id: string;
  method: string;
  params: unknown;
}

export interface ResponseFrame {
  type: "res";
  id: string;
  ok: boolean;
  payload?: unknown;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface EventFrame {
  type: "event";
  event: string;
  payload?: unknown;
}

export type Frame = RequestFrame | ResponseFrame | EventFrame;

/**
 * 序列化请求帧
 */
export function serializeRequest(frame: RequestFrame): string {
  return JSON.stringify(frame);
}

/**
 * 反序列化帧
 */
export function deserializeFrame(data: string): Frame | null {
  try {
    const frame = JSON.parse(data);
    if (frame && typeof frame === "object" && "type" in frame) {
      return frame as Frame;
    }
    return null;
  } catch {
    return null;
  }
}
