import { describe, it, expect, beforeEach } from "vitest";
import { LocalStorage } from "./local-storage";

// Mock localStorage
const mockStorage = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => mockStorage.get(key) || null,
  setItem: (key: string, value: string) => { mockStorage.set(key, value); },
  removeItem: (key: string) => { mockStorage.delete(key); },
  clear: () => { mockStorage.clear(); },
  get length() { return mockStorage.size; },
  key: (index: number) => {
    const keys = Array.from(mockStorage.keys());
    return keys[index] || null;
  },
  // Add support for Object.keys iteration
  [Symbol.iterator]: function* () {
    for (const key of mockStorage.keys()) {
      yield key;
    }
  },
};

// Make Object.keys work with the mock
const originalObjectKeys = Object.keys;
Object.keys = function(obj: any) {
  if (obj === localStorageMock) {
    return Array.from(mockStorage.keys());
  }
  return originalObjectKeys(obj);
};

Object.defineProperty(global, "localStorage", { value: localStorageMock });

describe("LocalStorage", () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  it("should store and retrieve values", () => {
    const storage = new LocalStorage("test");
    storage.set("key1", { name: "value1" });
    expect(storage.get("key1")).toEqual({ name: "value1" });
  });

  it("should return null for non-existent keys", () => {
    const storage = new LocalStorage("test");
    expect(storage.get("nonexistent")).toBeNull();
  });

  it("should remove values", () => {
    const storage = new LocalStorage("test");
    storage.set("key1", "value1");
    storage.remove("key1");
    expect(storage.get("key1")).toBeNull();
  });

  it("should clear all values with prefix", () => {
    const storage = new LocalStorage("test");
    storage.set("key1", "value1");
    storage.set("key2", "value2");
    storage.clear();
    // After clear, both keys should be removed
    expect(storage.get("key1")).toBeNull();
    expect(storage.get("key2")).toBeNull();
  });

  it("should get all values", () => {
    const storage = new LocalStorage("test");
    storage.set("key1", "value1");
    storage.set("key2", "value2");
    const all = storage.getAll();
    expect(all.key1).toBe("value1");
    expect(all.key2).toBe("value2");
  });

  it("should handle different prefixes", () => {
    const storage1 = new LocalStorage("prefix1");
    const storage2 = new LocalStorage("prefix2");
    storage1.set("key", "value1");
    storage2.set("key", "value2");
    expect(storage1.get("key")).toBe("value1");
    expect(storage2.get("key")).toBe("value2");
  });
});
