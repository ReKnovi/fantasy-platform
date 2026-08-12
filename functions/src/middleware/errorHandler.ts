import {NextFunction, Request, Response} from "express";
import {DatabaseError} from "pg";
import {AppError} from "../errors/AppError";

interface PostgresError extends Error {
  code?: string;
  constraint?: string;
  detail?: string;
}

const isPostgresError = (err: unknown): err is PostgresError => {
  return err instanceof DatabaseError;
};

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  void _next;

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined && {
          details: err.details,
        }),
      },
    });
    return;
  }

  if (isPostgresError(err)) {
    if (err.code === "23505") {
      console.error("PostgreSQL unique constraint violation", {
        path: req.path,
        method: req.method,
        constraint: err.constraint,
      });

      res.status(409).json({
        error: {
          code: "RESOURCE_CONFLICT",
          message: "A resource with the same unique value already exists",
        },
      });
      return;
    }

    console.error("PostgreSQL error", {
      path: req.path,
      method: req.method,
      code: err.code,
      constraint: err.constraint,
    });

    res.status(500).json({
      error: {
        code: "DATABASE_ERROR",
        message: "A database error occurred",
      },
    });
    return;
  }

  console.error("Unhandled application error", {
    path: req.path,
    method: req.method,
    error: err,
  });

  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
    },
  });
}
