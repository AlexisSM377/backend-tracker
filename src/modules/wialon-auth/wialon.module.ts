import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WialonController } from './infrastructure/controller/wialon.controller';
import { WialonHttpRepository } from './infrastructure/http/wialon-http.rep';

import { UsersModule } from '../users/users.module';
import { WialonSessionService } from './domain/services/wialon-auth.service';
import { WialonSidInterceptor } from './application/wialon-interceptor';

@Module({
  imports: [ConfigModule, UsersModule],
  providers: [
    WialonSessionService,
    WialonSidInterceptor,
    {
      provide: 'WialonAuthRepository',
      useClass: WialonHttpRepository,
    },
  ],
  controllers: [WialonController],
  exports: [WialonSessionService, WialonSidInterceptor],
})
export class WialonModule {}
