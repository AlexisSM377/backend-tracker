import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserOrmEntity } from './infrastructure/entities/user.orm-entity';
import { UsersController } from './infrastructure/controller/users.controller';
import { RegisterUserUseCase } from './application/use-cases/register-user.usecase';
import { UserRepositoryImpl } from './infrastructure/repositories/user.repository.impl';

@Module({
  imports: [TypeOrmModule.forFeature([UserOrmEntity])],
  controllers: [UsersController],
  providers: [
    RegisterUserUseCase,
    { provide: 'UserRepository', useClass: UserRepositoryImpl },
  ],
  exports: ['UserRepository'],
})
export class UsersModule {}
