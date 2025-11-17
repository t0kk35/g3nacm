export class BaseError extends Error {
  public readonly code: string;
  public readonly origin: string;
  public readonly cause?: Error;

  constructor(code = "INTERNAL_ERROR", origin: string, message: string, cause?: Error) {
    super(message, { cause });
    this.code = code;
    this.origin = origin
    this.cause = cause;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}