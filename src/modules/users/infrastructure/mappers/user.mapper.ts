import { User } from '../../domain/user.entity';
import { UserOrmEntity } from '../entities/user.orm-entity';

export class UserMapper {
  static toDomain(userOrm: UserOrmEntity): User {
    return new User(
      userOrm.id,
      userOrm.username,
      userOrm.password,
      String(userOrm.isActive ?? true),
    );
  }

  static toOrm(user: User): UserOrmEntity {
    const orm = new UserOrmEntity();
    if (user.id !== null) {
      orm.id = user.id;
    }
    orm.username = user.username;
    orm.password = user.password;
    orm.isActive = user.isActive === 'true';
    return orm;
  }
}
