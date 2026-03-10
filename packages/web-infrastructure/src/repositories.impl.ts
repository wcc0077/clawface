import type { Gateway, GatewayRepository } from "@openclaw/web-domain";
import { BehaviorSubject, type Observable } from "@openclaw/web-domain";
import { LocalStorage } from "./storage/local-storage";

const STORAGE_KEY = "gateways";

/**
 * Gateway Repository 实现（基于 localStorage）
 */
export class LocalStorageGatewayRepository implements GatewayRepository {
  private storage: LocalStorage;
  private cache = new BehaviorSubject<Record<string, Gateway>>({});

  constructor() {
    this.storage = new LocalStorage("openclaw");
    // Load from storage on init
    const stored = this.storage.get<Record<string, Gateway>>(STORAGE_KEY);
    if (stored) {
      this.cache.next(stored);
    }
  }

  async findAll(): Promise<Gateway[]> {
    return Object.values(this.cache.value);
  }

  async findById(id: string): Promise<Gateway | null> {
    return this.cache.value[id] || null;
  }

  async save(gateway: Gateway): Promise<void> {
    const current = this.cache.value;
    this.cache.next({ ...current, [gateway.id]: gateway });
    this.storage.set(STORAGE_KEY, this.cache.value);
  }

  async delete(id: string): Promise<void> {
    const { [id]: _, ...rest } = this.cache.value;
    this.cache.next(rest);
    this.storage.set(STORAGE_KEY, rest);
  }

  observe(id: string): Observable<Gateway> {
    return {
      subscribe: (observer) => {
        const unsubscribe = this.cache.subscribe((gateways) => {
          if (gateways[id]) {
            observer(gateways[id]);
          }
        });
        return unsubscribe;
      },
    };
  }
}
