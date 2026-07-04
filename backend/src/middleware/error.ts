import type { NextFunction, Request, Response } from "express";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

export function notFound(_req: Request, _res: Response, next: NextFunction): void {
  next(new ApiError(404, "Az erőforrás nem található", "NOT_FOUND"));
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: { message: err.message, code: err.code ?? "ERROR" } });
    return;
  }
  if (err instanceof Error && err.name === "ValidationError") {
    res.status(400).json({ error: { message: err.message, code: "VALIDATION" } });
    return;
  }
  if (err instanceof Error && err.name === "CastError") {
    res.status(400).json({ error: { message: "Érvénytelen azonosító", code: "BAD_ID" } });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { message: "Váratlan szerverhiba", code: "INTERNAL" } });
}

export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
