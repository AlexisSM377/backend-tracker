import { InjectRepository } from '@nestjs/typeorm';
import { UserRepository } from '../../domain/repositories/user.repository';
import { UserOrmEntity } from '../entities/user.orm-entity';
import { Repository } from 'typeorm';
import { User } from '../../domain/user.entity';
import { UserMapper } from '../mappers/user.mapper';

export class UserRepositoryImpl implements UserRepository {
  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly ormRepo: Repository<UserOrmEntity>,
  ) {}

  async findByUsername(username: string): Promise<User | null> {
    const userOrm = await this.ormRepo.findOne({ where: { username } });
    return userOrm ? UserMapper.toDomain(userOrm) : null;
  }

  async save(user: User): Promise<User> {
    const entity = this.ormRepo.create(UserMapper.toOrm(user));
    const saved = await this.ormRepo.save(entity);
    return UserMapper.toDomain(saved);
  }

  async findById(id: string): Promise<User | null> {
    const userOrm = await this.ormRepo.findOne({ where: { id } });
    return userOrm ? UserMapper.toDomain(userOrm) : null;
  }

  async updateWialonSession(
    userId: string,
    sid: string,
    expiryDate: Date,
  ): Promise<void> {
    await this.ormRepo.update(userId, {
      wialonSid: sid,
      wialonSidExpiry: expiryDate,
    });
  }
}
