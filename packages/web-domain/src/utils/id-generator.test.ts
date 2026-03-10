import { describe, it, expect } from "vitest";
import { generateId, generateDeviceId, parseSessionKey, serializeSessionKey } from "../utils/id-generator";

describe("ID Generator", () => {
  it("should generate unique IDs", () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });

  it("should generate valid device IDs", () => {
    const deviceId = generateDeviceId();
    // Device ID should have 5 parts (16 bytes = 32 hex chars + 4 dashes)
    const parts = deviceId.split("-");
    expect(parts.length).toBeGreaterThanOrEqual(5);
  });

  it("should parse valid session keys", () => {
    const key = parseSessionKey("gw1:agent1:channel1");
    expect(key).toEqual({
      gatewayId: "gw1",
      agentId: "agent1",
      channelId: "channel1",
    });
  });

  it("should throw for invalid session keys", () => {
    expect(() => parseSessionKey("invalid")).toThrow();
  });

  it("should serialize and parse session keys", () => {
    const sessionKey = { gatewayId: "gw1", agentId: "agent1", channelId: "channel1" };
    const serialized = serializeSessionKey(sessionKey);
    const parsed = parseSessionKey(serialized);
    expect(parsed).toEqual(sessionKey);
  });
});
