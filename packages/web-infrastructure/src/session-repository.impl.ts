import type { Message, Session, SessionKey, SessionRepository } from "@openclaw/web-domain";
import { BehaviorSubject, type Observable } from "@openclaw/web-domain";
import { IndexedDBWrapper } from "./storage/idb";
import { serializeSessionKey, parseSessionKey } from "@openclaw/web-domain";

const DB_NAME = "openclaw-sessions";
const DB_VERSION = 1;
const STORE_NAME = "sessions";

/**
 * Session Repository 实现（基于 IndexedDB）
 */
export class IndexedDBSessionRepository implements SessionRepository {
  private db: IndexedDBWrapper;
  private messageSubjects = new Map<string, BehaviorSubject<Message[]>>();

  constructor() {
    this.db = new IndexedDBWrapper({
      name: DB_NAME,
      version: DB_VERSION,
      stores: {
        [STORE_NAME]: { keyPath: "key" },
      },
    });
  }

  private sessionKeyToString(key: SessionKey | string): string {
    // Handle both object and string formats
    if (typeof key === 'string') {
      return key;
    }
    return serializeSessionKey(key);
  }

  private stringToSessionKey(keyStr: string): SessionKey {
    return parseSessionKey(keyStr);
  }

  async findAll(gatewayId: string): Promise<Session[]> {
    await this.db.open();
    const sessions = await this.db.getAll<Session>(STORE_NAME);
    return sessions.filter((s) => s.gatewayId === gatewayId);
  }

  async findByKey(key: SessionKey): Promise<Session | null> {
    try {
      await this.db.open();
      const keyStr = this.sessionKeyToString(key);
      const result = await this.db.get<Session>(STORE_NAME, keyStr);

      // Convert key string back to SessionKey object
      if (result && typeof result.key === 'string') {
        return {
          ...result,
          key: this.stringToSessionKey(result.key),
        };
      }

      return result;
    } catch (err) {
      console.error('[IndexedDBSessionRepository] findByKey error:', err);
      throw err;
    }
  }

  async save(session: Session): Promise<void> {
    try {
      await this.db.open();
      const sessionWithKey = { ...session, key: this.sessionKeyToString(session.key) };
      await this.db.put(STORE_NAME, sessionWithKey);
    } catch (err) {
      console.error('[IndexedDBSessionRepository] save error:', err);
      throw err;
    }
  }

  async delete(key: SessionKey): Promise<void> {
    await this.db.open();
    await this.db.delete(STORE_NAME, this.sessionKeyToString(key));
  }

  observeMessages(key: SessionKey): Observable<Message[]> {
    const keyStr = this.sessionKeyToString(key);
    let subject = this.messageSubjects.get(keyStr);

    if (!subject) {
      subject = new BehaviorSubject<Message[]>([]);
      this.messageSubjects.set(keyStr, subject);

      // Load existing messages
      this.findByKey(key).then((session) => {
        if (session) {
          subject?.next(session.messages);
        }
      });
    }

    return {
      subscribe: (observer) => {
        return subject!.subscribe(observer);
      },
    };
  }

  /**
   * Add a message to a session (helper method)
   */
  async addMessage(key: SessionKey, message: Message): Promise<void> {
    try {
      const session = await this.findByKey(key);
      if (session) {
        session.messages = [...session.messages, message];
        session.updatedAt = Date.now();
        await this.save(session);

        // Notify observers
        const keyStr = this.sessionKeyToString(key);
        const subject = this.messageSubjects.get(keyStr);
        if (subject) {
          subject.next(session.messages);
        }
      }
    } catch (err) {
      console.error('[IndexedDBSessionRepository] addMessage error:', err);
      throw err;
    }
  }
}
