import { ConflictException, Inject, Injectable } from '@nestjs/common';
import type { UserRepository } from '../../domain/repositories/user.repository';
import { User } from '../../domain/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class RegisterUserUseCase {
  constructor(
    @Inject('UserRepository')
    private readonly userRepo: UserRepository,
  ) {}

  async execute(username: string, password: string): Promise<User> {
    const exists = await this.userRepo.findByUsername(username);
    if (exists) throw new ConflictException('Username already taken');

    const hashed = await bcrypt.hash(password, 10);
    const user = User.create(username, hashed, 'true');

    return this.userRepo.save(user);
  }
}
