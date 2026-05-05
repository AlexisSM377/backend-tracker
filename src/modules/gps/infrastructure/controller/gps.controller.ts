import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/infrastructure/guards/jwt-auth.guard';
import { WialonSidInterceptor } from 'src/modules/wialon-auth/application/wialon-interceptor';
import { WialonSid } from 'src/modules/wialon-auth/infrastructure/http/wialon-sid';
import { ExecuteCommandDto } from '../../application/dto/execute-command.dto';
import { ExecuteUnitCommandDto } from '../../application/dto/execute-unit-command.dto';
import { NoReportQueryDto } from '../../application/dto/no-report-query.dto';
import { GpsCommandService } from '../../application/services/gps-command.service';
import { NoReportService } from '../../application/services/no-report.service';

@ApiTags('GPS')
@ApiBearerAuth('jwt')
@Controller('gps')
@UseGuards(JwtAuthGuard)
@UseInterceptors(WialonSidInterceptor)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class GpsController {
  constructor(
    private readonly gpsCommandService: GpsCommandService,
    private readonly noReportService: NoReportService,
  ) {}

  @Post('commands/:cmd')
  @ApiOperation({ summary: 'Ejecutar comando GPS por tipo logico' })
  @ApiParam({
    name: 'cmd',
    enum: ['query', 'block_engine', 'unblock_engine'],
    description: 'Comando logico soportado por la API.',
  })
  @ApiBody({ type: ExecuteCommandDto })
  @ApiResponse({ status: 201, description: 'Comando enviado a Wialon.' })
  @ApiResponse({ status: 404, description: 'Unidad no encontrada.' })
  @ApiResponse({
    status: 409,
    description: 'Comando no disponible o error de Wialon.',
  })
  async executeCommand(
    @Param('cmd') cmd: string,
    @Body() dto: ExecuteCommandDto,
    @WialonSid() sid: string,
  ) {
    return this.gpsCommandService.execute({
      sid,
      cmd,
      serialNumber: dto.serialNumber,
      userId: dto.userId,
    });
  }

  @Get('units/:unitId/commands')
  @ApiOperation({
    summary: 'Listar comandos configurados en una unidad Wialon',
  })
  @ApiParam({ name: 'unitId', example: 402245387 })
  @ApiResponse({
    status: 200,
    description: 'Comandos configurados y disponibles.',
  })
  async getUnitCommands(
    @Param('unitId', ParseIntPipe) unitId: number,
    @WialonSid() sid: string,
  ) {
    return this.gpsCommandService.listUnitCommands(sid, unitId);
  }

  @Post('units/:unitId/commands/exec')
  @ApiOperation({ summary: 'Ejecutar comando Wialon por nombre exacto' })
  @ApiParam({ name: 'unitId', example: 402245387 })
  @ApiBody({ type: ExecuteUnitCommandDto })
  @ApiResponse({ status: 201, description: 'Comando enviado a Wialon.' })
  @ApiResponse({
    status: 409,
    description: 'Error al ejecutar comando en Wialon.',
  })
  async executeUnitCommand(
    @Param('unitId', ParseIntPipe) unitId: number,
    @Body() dto: ExecuteUnitCommandDto,
    @WialonSid() sid: string,
  ) {
    return this.gpsCommandService.executeDirect({
      sid,
      unitId,
      commandName: dto.commandName,
      linkType: dto.linkType || 'tcp',
      param: dto.param || '',
      userId: dto.userId,
    });
  }

  @Get('no-reporta')
  @ApiOperation({ summary: 'Listar GPS instalados que no reportan' })
  @ApiQuery({ name: 'minMinutes', required: false, example: 1440 })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiResponse({
    status: 200,
    description: 'Listado paginado de unidades sin reporte.',
  })
  async getNoReportUnits(
    @Query() query: NoReportQueryDto,
    @WialonSid() sid: string,
  ) {
    return this.noReportService.findLatest({
      sid,
      minMinutes: query.minMinutes,
      page: query.page,
      limit: query.limit,
    });
  }
}
