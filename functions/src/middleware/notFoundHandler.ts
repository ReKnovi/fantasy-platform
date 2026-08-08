import {Request, Response} from "express";
import {notFound} from "../errors/errors";

export function notFoundHandler(req: Request, res: Response): void {
  const error = notFound(`Route ${req.method} ${req.path} not found`);

  res.status(error.statusCode).json({
    error: {
      code: error.code,
      message: error.message,
    },
  });
}
