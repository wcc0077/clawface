/**
 * 简单的 Observable 实现
 */
export interface Observable<T> {
  subscribe(observer: (value: T) => void): () => void;
}

/**
 * BehaviorSubject - 带有初始值的 Observable
 */
export class BehaviorSubject<T> implements Observable<T> {
  private observers: Set<(value: T) => void> = new Set();

  constructor(private currentValue: T) {}

  get value(): T {
    return this.currentValue;
  }

  subscribe(observer: (value: T) => void): () => void {
    this.observers.add(observer);
    // 立即发送当前值
    observer(this.currentValue);
    return () => {
      this.observers.delete(observer);
    };
  }

  next(value: T): void {
    this.currentValue = value;
    this.observers.forEach((observer) => observer(value));
  }
}
