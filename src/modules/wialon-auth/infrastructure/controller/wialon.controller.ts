import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from 'src/modules/auth/infrastructure/guards/jwt-auth.guard';
import { WialonSidInterceptor } from '../../application/wialon-interceptor';
import { WialonSid } from '../http/wialon-sid';
import { WialonSessionService } from '../../domain/services/wialon-auth.service';

@Controller('wialon')
@UseGuards(JwtAuthGuard)
@UseInterceptors(WialonSidInterceptor)
export class WialonController {
  constructor(
    private readonly configService: ConfigService,
    private readonly wialonSessionService: WialonSessionService,
  ) {}

  @Get('retranslators')
  async getRetranslators(@WialonSid() sid: string) {
    const wialonUrl = this.configService.get<string>('WIALON_API_URL');
    const response = await fetch(
      `${wialonUrl}?svc=core/search_items&params=${JSON.stringify({
        spec: {
          itemsType: 'avl_retranslator',
          propName: 'sys_name',
          propValueMask: '*',
          sortType: 'sys_name',
        },
        force: 1,
        flags: 257,
        from: 0,
        to: 0,
      })}&sid=${sid}`,
      { method: 'POST' },
    );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return response.json();
  }

  @Get('retranslators/:name')
  async getRetranslatorByName(
    @Param('name') name: string,
    @WialonSid() sid: string,
  ) {
    const wialonUrl = this.configService.get<string>('WIALON_API_URL');
    const response = await fetch(
      `${wialonUrl}?svc=core/search_items&params=${JSON.stringify({
        spec: {
          itemsType: 'avl_retranslator',
          propName: 'sys_name',
          propValueMask: name,
          sortType: 'sys_name',
        },
        force: 1,
        flags: 16777215, // Este flag incluye las unidades asignadas
        from: 0,
        to: 0,
      })}&sid=${sid}`,
      { method: 'POST' },
    );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return response.json();
  }

  @Get('units')
  async getAllUnits(
    @WialonSid() sid: string,
    @Query('search') search?: string,
  ) {
    const wialonUrl = this.configService.get<string>('WIALON_API_URL');
    const response = await fetch(
      `${wialonUrl}?svc=core/search_items&params=${JSON.stringify({
        spec: {
          itemsType: 'avl_unit',
          propName: 'sys_name',
          propValueMask: search || '*',
          sortType: 'sys_name',
        },
        force: 1,
        flags: 1,
        from: 0,
        to: 0,
      })}&sid=${sid}`,
      { method: 'POST' },
    );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return response.json();
  }

  /**
   * Forzar renovación manual del SID de Wialon
   * Útil cuando se detectan errores de sesión expirada
   */
  @Post('session/refresh')
  async refreshSession(@Req() req: any) {
    const newSid = await this.wialonSessionService.refreshWialonSession(
      req.user.userId,
    );
    return {
      message: 'Sesión de Wialon renovada exitosamente',
      sidPreview: `${newSid.substring(0, 10)}...`,
      renewedAt: new Date().toISOString(),
    };
  }

  /**
   * Verificar el estado de la sesión actual de Wialon
   */
  @Get('session/status')
  async getSessionStatus(@Req() req: any, @WialonSid() sid: string) {
    return {
      hasValidSid: !!sid,
      sidPreview: sid ? `${sid.substring(0, 10)}...` : null,
      checkedAt: new Date().toISOString(),
    };
  }
}
