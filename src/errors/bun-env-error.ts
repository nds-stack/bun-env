export class BunEnvError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "BunEnvError";
  }
}
