import type { Observable } from "../utils/observable";
import type { Gateway } from "../entities";

/**
 * Gateway Repository 接口
 */
export interface GatewayRepository {
  /**
   * 获取所有 Gateway
   */
  findAll(): Promise<Gateway[]>;

  /**
   * 根据 ID 获取 Gateway
   */
  findById(id: string): Promise<Gateway | null>;

  /**
   * 保存 Gateway
   */
  save(gateway: Gateway): Promise<void>;

  /**
   * 删除 Gateway
   */
  delete(id: string): Promise<void>;

  /**
   * 观察 Gateway 变化
   */
  observe(id: string): Observable<Gateway>;
}
