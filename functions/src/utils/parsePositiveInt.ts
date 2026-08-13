import {badRequest} from "../errors/errors";

export function parsePositiveInt(value: unknown, name: string): number {
  if (typeof value === "number") {
    if (Number.isFinite(value) && value > 0 && Number.isInteger(value)) {
      return value;
    }
  }

  if (typeof value === "string") {
    if (value.trim() === "") {
      throw badRequest(`${name} must be a positive integer`);
    }
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0 && Number.isInteger(parsed)) {
      return parsed;
    }
  }

  throw badRequest(`${name} must be a positive integer`);
}
