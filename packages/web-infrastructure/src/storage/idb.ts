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
    console.log('[IndexedDBWrapper] open() called, db=', this.db);
    if (this.db) {
      console.log('[IndexedDBWrapper] DB already open');
      return this;
    }
    if (this.openPromise) {
      console.log('[IndexedDBWrapper] openPromise exists, waiting...');
      return this.openPromise;
    }

    this.openPromise = new Promise((resolve, reject) => {
      console.log('[IndexedDBWrapper] Opening indexedDB:', this.config.name, 'version:', this.config.version);
      const request = indexedDB.open(this.config.name, this.config.version);

      request.onerror = () => {
        console.error('[IndexedDBWrapper] open error:', request.error);
        reject(request.error);
      };
      request.onsuccess = () => {
        console.log('[IndexedDBWrapper] open success');
        this.db = request.result;
        resolve(this);
      };

      request.onupgradeneeded = (event) => {
        console.log('[IndexedDBWrapper] upgrade needed');
        const db = (event.target as IDBOpenDBRequest).result;
        for (const [storeName, params] of Object.entries(this.config.stores)) {
          if (!db.objectStoreNames.contains(storeName)) {
            console.log('[IndexedDBWrapper] Creating store:', storeName, params);
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
    console.log('[IndexedDBWrapper] transaction called:', { storeName, mode });
    await this.open();
    const db = this.db;
    if (!db) throw new Error("Database not opened");

    return new Promise((resolve, reject) => {
      console.log('[IndexedDBWrapper] Creating transaction:', storeName, mode);
      const transaction = db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      let result: T | undefined;

      transaction.oncomplete = () => {
        console.log('[IndexedDBWrapper] transaction complete, result:', result);
        if (result !== undefined) {
          resolve(result);
        } else {
          resolve(undefined as T);
        }
      };
      transaction.onerror = () => {
        console.error('[IndexedDBWrapper] transaction error:', transaction.error);
        reject(transaction.error);
      };

      fn(store)
        .then((r) => {
          console.log('[IndexedDBWrapper] transaction fn completed:', r);
          result = r;
        })
        .catch((err) => {
          console.error('[IndexedDBWrapper] transaction fn error:', err);
          reject(err);
        });
    });
  }

  async get<T>(storeName: string, key: IDBValidKey): Promise<T | null> {
    console.log('[IndexedDBWrapper] get() called:', { storeName, key });
    try {
      await this.open();
      const db = this.db;
      if (!db) throw new Error("Database not opened");

      return new Promise((resolve, reject) => {
        console.log('[IndexedDBWrapper] Creating readonly transaction for get');
        const transaction = db.transaction(storeName, "readonly");
        const store = transaction.objectStore(storeName);
        const request = store.get(key);

        request.onsuccess = () => {
          console.log('[IndexedDBWrapper] get success:', request.result);
          resolve(request.result as T | null);
        };
        request.onerror = () => {
          console.error('[IndexedDBWrapper] get error:', request.error);
          reject(request.error);
        };
        transaction.onerror = () => {
          console.error('[IndexedDBWrapper] transaction error:', transaction.error);
          reject(transaction.error);
        };
      });
    } catch (err) {
      console.error('[IndexedDBWrapper] get error:', err);
      throw err;
    }
  }

  async put<T>(storeName: string, value: T, key?: IDBValidKey): Promise<void> {
    console.log('[IndexedDBWrapper] put() called:', { storeName, key, value });
    try {
      return this.transaction(storeName, "readwrite", async (store) => {
        return new Promise((resolve, reject) => {
          const request = key ? store.put(value, key) : store.put(value);
          request.onsuccess = () => {
            console.log('[IndexedDBWrapper] put success');
            resolve();
          };
          request.onerror = () => {
            console.error('[IndexedDBWrapper] put error:', request.error);
            reject(request.error);
          };
        });
      });
    } catch (err) {
      console.error('[IndexedDBWrapper] put error:', err);
      throw err;
    }
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
