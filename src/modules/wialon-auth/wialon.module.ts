import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WialonController } from './infrastructure/controller/wialon.controller';
import { WialonHttpRepository } from './infrastructure/http/wialon-http.rep';

import { UsersModule } from '../users/users.module';
import { WialonSessionService } from './domain/services/wialon-auth.service';
import { WialonSidInterceptor } from './application/wialon-interceptor';
import { WialonApiService } from './application/services/wialon.service';

@Module({
  imports: [ConfigModule, UsersModule],
  providers: [
    WialonSessionService,
    WialonApiService,
    WialonSidInterceptor,
    {
      provide: 'WialonAuthRepository',
      useClass: WialonHttpRepository,
    },
  ],
  controllers: [WialonController],
  exports: [WialonSessionService, WialonSidInterceptor, WialonApiService],
})
export class WialonModule {}
