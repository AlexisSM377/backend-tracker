import {
  Controller,
  Get,
  Param,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/infrastructure/guards/jwt-auth.guard';
import { WialonSidInterceptor } from 'src/modules/wialon-auth/application/wialon-interceptor';
import { WialonSid } from 'src/modules/wialon-auth/infrastructure/http/wialon-sid';
import { RecoveryService } from '../../application/services/recovery.service';

@Controller('recovery')
@UseGuards(JwtAuthGuard)
@UseInterceptors(WialonSidInterceptor)
export class RecoveryController {
  constructor(private readonly recoveryService: RecoveryService) {}

  @Get(':vim')
  async getRecovery(@Param('vim') vim: string, @WialonSid() sid: string) {
    return this.recoveryService.findByVim(sid, vim);
  }
}
