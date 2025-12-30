import { User } from '../user.entity';

export interface UserRepository {
  findByUsername(username: string): Promise<User | null>;
  save(user: User): Promise<User>;
  findById(id: string): Promise<User | null>;
  updateWialonSession(
    userId: string,
    sid: string,
    expiryDate: Date,
  ): Promise<void>;
}
