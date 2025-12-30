export class User {
  constructor(
    public id: string | null,
    public username: string,
    public password: string,
    public isActive: string,
  ) {}

  static create(username: string, password: string, isActive: string) {
    return new User(null, username, password, isActive);
  }
}
