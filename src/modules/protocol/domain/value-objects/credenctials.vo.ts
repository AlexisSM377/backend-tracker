export class Credentials {
  constructor(public readonly value: Record<string, unknown>) {
    if (!value || Object.keys(value).length === 0) {
      throw new Error('Credentials cannot be empty');
    }
  }
}
