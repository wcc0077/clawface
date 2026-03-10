/**
 * localStorage 封装
 */
export class LocalStorage {
  private prefix: string;

  constructor(prefix: string = "openclaw") {
    this.prefix = `${prefix}:`;
  }

  private key(k: string): string {
    return `${this.prefix}${k}`;
  }

  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(this.key(key));
      if (item === null) return null;
      return JSON.parse(item) as T;
    } catch {
      return null;
    }
  }

  set<T>(key: string, value: T): void {
    localStorage.setItem(this.key(key), JSON.stringify(value));
  }

  remove(key: string): void {
    localStorage.removeItem(this.key(key));
  }

  clear(): void {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(this.prefix));
    keys.forEach((k) => localStorage.removeItem(k));
  }

  getAll<T>(): Record<string, T> {
    const result: Record<string, T> = {};
    const prefix = this.key("");
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) {
        const value = this.get<T>(key.slice(prefix.length));
        if (value !== null) {
          result[key.slice(prefix.length)] = value;
        }
      }
    }
    return result;
  }
}
