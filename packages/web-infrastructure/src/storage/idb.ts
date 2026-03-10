/**
 * IndexedDB 封装
 */
export interface DBConfig {
  name: string;
  version: number;
  stores: Record<string, IDBObjectStoreParameters>;
}

export class IndexedDBWrapper {
  private db: IDBDatabase | null = null;
  private config: DBConfig;
  private openPromise: Promise<IndexedDBWrapper> | null = null;

  constructor(config: DBConfig) {
    this.config = config;
  }

  async open(): Promise<IndexedDBWrapper> {
    if (this.db) return this;
    if (this.openPromise) return this.openPromise;

    this.openPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.name, this.config.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        for (const [storeName, params] of Object.entries(this.config.stores)) {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, params);
          }
        }
      };
    });

    return this.openPromise;
  }

  async transaction<T>(
    storeName: string,
    mode: IDBTransactionMode,
    fn: (store: IDBObjectStore) => Promise<T>
  ): Promise<T> {
    await this.open();
    const db = this.db;
    if (!db) throw new Error("Database not opened");

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      let result: T | undefined;

      transaction.oncomplete = () => {
        if (result !== undefined) {
          resolve(result);
        }
      };
      transaction.onerror = () => reject(transaction.error);

      fn(store)
        .then((r) => {
          result = r;
        })
        .catch(reject);
    });
  }

  async get<T>(storeName: string, key: IDBValidKey): Promise<T | null> {
    return this.transaction(storeName, "readonly", async (store) => {
      return new Promise((resolve, reject) => {
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result as T | null);
        request.onerror = () => reject(request.error);
      });
    });
  }

  async put<T>(storeName: string, value: T, key?: IDBValidKey): Promise<void> {
    return this.transaction(storeName, "readwrite", async (store) => {
      return new Promise((resolve, reject) => {
        const request = key ? store.put(value, key) : store.put(value);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  }

  async delete(storeName: string, key: IDBValidKey): Promise<void> {
    return this.transaction(storeName, "readwrite", async (store) => {
      return new Promise((resolve, reject) => {
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    return this.transaction(storeName, "readonly", async (store) => {
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result as T[]);
        request.onerror = () => reject(request.error);
      });
    });
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.openPromise = null;
    }
  }
}
