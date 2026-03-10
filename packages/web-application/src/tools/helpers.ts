import { Type } from "@sinclair/typebox";

/**
 * 创建 TypeBox Schema 的辅助函数
 */
export function createStringSchema(description: string, options?: { required?: boolean }) {
  return Type.String({ description, ...(options?.required === false ? {} : {}) });
}

export function createNumberSchema(description: string, options?: { default?: number }) {
  return Type.Number({ description, default: options?.default });
}

export function createBooleanSchema(description: string, options?: { default?: boolean }) {
  return Type.Boolean({ description, default: options?.default });
}

export function createOptionalStringSchema(description: string) {
  return Type.Optional(Type.String({ description }));
}

export function createOptionalNumberSchema(description: string) {
  return Type.Optional(Type.Number({ description }));
}
