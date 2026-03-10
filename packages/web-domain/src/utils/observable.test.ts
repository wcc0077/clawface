import { describe, it, expect } from "vitest";
import { BehaviorSubject } from "../utils/observable";

describe("BehaviorSubject", () => {
  it("should emit initial value on subscribe", () => {
    const subject = new BehaviorSubject("initial");
    const values: string[] = [];
    subject.subscribe((v) => values.push(v));
    expect(values).toEqual(["initial"]);
  });

  it("should emit new values", () => {
    const subject = new BehaviorSubject(0);
    const values: number[] = [];
    subject.subscribe((v) => values.push(v));
    subject.next(1);
    subject.next(2);
    expect(values).toEqual([0, 1, 2]);
  });

  it("should unsubscribe correctly", () => {
    const subject = new BehaviorSubject("value");
    const values: string[] = [];
    const unsubscribe = subject.subscribe((v) => values.push(v));
    subject.next("new");
    unsubscribe();
    subject.next("after");
    expect(values).toEqual(["value", "new"]);
  });

  it("should return current value", () => {
    const subject = new BehaviorSubject("first");
    expect(subject.value).toBe("first");
    subject.next("second");
    expect(subject.value).toBe("second");
  });
});
