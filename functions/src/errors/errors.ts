import {AppError} from "./AppError";

export const badRequest = (
  message = "Invalid request",
  details?: unknown
): AppError =>
  new AppError({
    code: "BAD_REQUEST",
    statusCode: 400,
    message,
    details,
  });

export const unauthorized = (message = "Authentication required"): AppError =>
  new AppError({
    code: "UNAUTHORIZED",
    statusCode: 401,
    message,
  });

export const forbidden = (
  message = "You do not have permission to perform this action"
): AppError =>
  new AppError({
    code: "FORBIDDEN",
    statusCode: 403,
    message,
  });

export const notFound = (message = "Resource not found"): AppError =>
  new AppError({
    code: "NOT_FOUND",
    statusCode: 404,
    message,
  });

export const conflict = (
  message = "Resource already exists",
  details?: unknown
): AppError =>
  new AppError({
    code: "CONFLICT",
    statusCode: 409,
    message,
    details,
  });
