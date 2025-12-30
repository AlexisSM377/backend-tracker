export class User {
  constructor(
    public id: string | null,
    public username: string,
    public password: string,
    public isActive: string,
    public wialonSid?: string | null,
    public wialonSidExpiry?: Date | null,
  ) {}

  static create(username: string, password: string, isActive: string) {
    return new User(null, username, password, isActive);
  }

  isWialonSidValid(): boolean {
    if (!this.wialonSid || !this.wialonSidExpiry) return false;
    return new Date() < this.wialonSidExpiry;
  }
}
