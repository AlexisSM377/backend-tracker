import {
  Controller,
  Get,
  Param,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/infrastructure/guards/jwt-auth.guard';
import { WialonSidInterceptor } from 'src/modules/wialon-auth/application/wialon-interceptor';
import { WialonSid } from 'src/modules/wialon-auth/infrastructure/http/wialon-sid';
import { RecoveryService } from '../../application/services/recovery.service';

@ApiTags('Recovery')
@ApiBearerAuth('jwt')
@Controller('recovery')
@UseGuards(JwtAuthGuard)
@UseInterceptors(WialonSidInterceptor)
export class RecoveryController {
  constructor(private readonly recoveryService: RecoveryService) {}

  @Get(':vim')
  @ApiOperation({ summary: 'Obtener bitacora de recuperacion por VIN/VIM' })
  @ApiParam({ name: 'vim', example: '3VW1E2JMXGM123456' })
  @ApiResponse({ status: 200, description: 'Informacion de recuperacion.' })
  async getRecovery(@Param('vim') vim: string, @WialonSid() sid: string) {
    return this.recoveryService.findByVim(sid, vim);
  }
}
