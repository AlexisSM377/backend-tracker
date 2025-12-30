import { ConflictException, Inject, Injectable } from '@nestjs/common';
import type { UserRepository } from '../../domain/repositories/user.repository';
import { User } from '../../domain/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class CreateUserService {
  constructor(
    @Inject('UserRepository')
    private readonly userRepo: UserRepository,
  ) {}

  async execute(username: string, password: string): Promise<User> {
    const exists = await this.userRepo.findByUsername(username);
    if (exists) throw new ConflictException('El username ya está en uso');

    const hash = await bcrypt.hash(password, 10);
    const user = new User('', username, hash, 'true');
    return await this.userRepo.save(user);
  }
}
