export class DuplicateKeyError extends Error {
  public nInserted = 0;
  constructor(message: string) {
    super(message);
  }
}
