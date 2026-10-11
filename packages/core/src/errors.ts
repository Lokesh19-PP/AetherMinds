export class CoreError extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'CoreError';
    this.code = code;
    Object.setPrototypeOf(this, CoreError.prototype);
  }
}
