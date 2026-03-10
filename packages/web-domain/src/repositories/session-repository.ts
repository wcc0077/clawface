import type { Observable } from "../utils/observable";
import type { Message, Session, SessionKey } from "../entities";

/**
 * Session Repository 接口
 */
export interface SessionRepository {
  /**
   * 获取指定 Gateway 的所有 Session
   */
  findAll(gatewayId: string): Promise<Session[]>;

  /**
   * 根据 Key 获取 Session
   */
  findByKey(key: SessionKey): Promise<Session | null>;

  /**
   * 保存 Session
   */
  save(session: Session): Promise<void>;

  /**
   * 删除 Session
   */
  delete(key: SessionKey): Promise<void>;

  /**
   * 观察 Session 消息变化
   */
  observeMessages(key: SessionKey): Observable<Message[]>;
}
