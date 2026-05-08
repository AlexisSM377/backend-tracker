/* eslint-disable @typescript-eslint/unbound-method */
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
import {
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/infrastructure/guards/jwt-auth.guard';
import { WialonSidInterceptor } from '../../application/wialon-interceptor';
import { WialonSid } from '../http/wialon-sid';
import { WialonSessionService } from '../../domain/services/wialon-auth.service';
import { WialonApiService } from '../../application/services/wialon.service';
import { RetranslatorResponseDto } from '../../application/dto/retranslator.dto';
import { UnitResponseDto } from '../../application/dto/unit.dto';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    username: string;
  };
}
@Controller('wialon')
@ApiTags('Wialon')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard)
@UseInterceptors(WialonSidInterceptor)
export class WialonController {
  constructor(
    private readonly wialonSessionService: WialonSessionService,
    private readonly wialonApiService: WialonApiService,
  ) {}

  @Get('retranslators')
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Listar retransmisores Wialon' })
  @ApiResponse({ status: 200, description: 'Listado de retransmisores.' })
  async getRetranslators(
    @WialonSid() sid: string,
  ): Promise<RetranslatorResponseDto[]> {
    const response = await this.wialonApiService.searchRetranslators(
      sid,
      '*',
      257,
    );

    return (response.items || []).map(RetranslatorResponseDto.fromWialon);
  }

  @Get('retranslators/:name')
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Buscar retransmisor Wialon por nombre' })
  @ApiResponse({ status: 200, description: 'Retransmisores encontrados.' })
  async getRetranslatorByName(
    @Param('name') name: string,
    @WialonSid() sid: string,
  ): Promise<RetranslatorResponseDto[]> {
    const retranslatorResponse =
      await this.wialonApiService.searchRetranslators(sid, name, 16777215);

    const items = retranslatorResponse.items || [];
    if (items.length === 0) {
      return [];
    }

    const unitIds: number[] = [];
    for (const item of items) {
      if (item.rtru && Array.isArray(item.rtru)) {
        for (const unit of item.rtru) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
          unitIds.push(unit.i);
        }
      }
    }

    if (unitIds.length === 0) {
      return items.map(RetranslatorResponseDto.fromWialon);
    }

    const unitsResponse = await this.wialonApiService.searchUnitsByIds(
      sid,
      unitIds,
    );

    const unitsMap = new Map();
    if (unitsResponse.items) {
      for (const unit of unitsResponse.items) {
        unitsMap.set(unit.id, {
          nm: unit.nm,
          cls: unit.cls,
          id: unit.id,
          mu: unit.mu,
          netconn: unit.netconn,
          uacl: unit.uacl,
        });
      }
    }

    for (const item of items) {
      if (item.rtru && Array.isArray(item.rtru)) {
        for (const unit of item.rtru) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          unit.unitInfo = unitsMap.get(unit.i) || null;
        }
      }
    }

    return items.map(RetranslatorResponseDto.fromWialon);
  }

  @Get('units')
  @ApiOperation({ summary: 'Listar unidades Wialon' })
  @ApiQuery({ name: 'search', required: false, example: '*' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, example: 50 })
  @ApiResponse({
    status: 200,
    description: 'Listado paginado de unidades Wialon.',
  })
  async getAllUnits(
    @WialonSid() sid: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<{
    items: UnitResponseDto[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const currentPage = parseInt(page || '1', 10);
    const size = parseInt(pageSize || '50', 10);
    const from = (currentPage - 1) * size;
    const to = from + size - 1;

    const response = await this.wialonApiService.searchUnits(
      sid,
      search || '*',
      2097153,
      from,
      to,
    );

    const items = (response.items || []).map(UnitResponseDto.fromWialon);
    const totalCount = response.totalItemsCount || 0;
    const totalPages = Math.ceil(totalCount / size);

    return {
      items,
      totalCount,
      page: currentPage,
      pageSize: size,
      totalPages,
    };
  }

  /**
   * Forzar renovación manual del SID de Wialon
   * Útil cuando se detectan errores de sesión expirada
   */
  @Post('session/refresh')
  @ApiOperation({ summary: 'Forzar renovacion de SID Wialon' })
  @ApiResponse({ status: 201, description: 'Sesion renovada.' })
  async refreshSession(@Req() req: AuthenticatedRequest) {
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
  @ApiOperation({ summary: 'Verificar estado de sesion Wialon actual' })
  @ApiResponse({ status: 200, description: 'Estado de sesion.' })
  getSessionStatus(@Req() req: AuthenticatedRequest, @WialonSid() sid: string) {
    return {
      hasValidSid: !!sid,
      sidPreview: sid ? `${sid.substring(0, 10)}...` : null,
      checkedAt: new Date().toISOString(),
    };
  }
}
