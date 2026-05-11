import {
  Body,
  Controller,
  Get,
  Param,
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
import { CreateGpsInstallationDto } from '../../application/dto/create-gps-installation.dto';
import { FindGpsInstallationsQueryDto } from '../../application/dto/find-gps-installations-query.dto';
import { GpsInstallationService } from '../../application/services/gps-installation.service';

@ApiTags('Registrar GPS como instalado')
@ApiBearerAuth('jwt')
@Controller('gps/installations')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class GpsInstallationsController {
  constructor(
    private readonly gpsInstallationService: GpsInstallationService,
  ) {}

  @Post()
  @UseInterceptors(WialonSidInterceptor)
  @ApiOperation({ summary: 'Registrar GPS como instalado' })
  @ApiBody({ type: CreateGpsInstallationDto })
  @ApiResponse({
    status: 201,
    description: 'Instalacion creada y vinculada con Wialon.',
  })
  @ApiResponse({ status: 404, description: 'UNIT_NOT_FOUND.' })
  @ApiResponse({ status: 409, description: 'INSTALLATION_ALREADY_ACTIVE.' })
  async createInstallation(
    @Body() dto: CreateGpsInstallationDto,
    @WialonSid() sid: string,
  ) {
    return this.gpsInstallationService.create({
      sid,
      vin: dto.vin,
      serialNumber: dto.serialNumber,
      provider: dto.provider,
      installedAt: dto.installedAt,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Buscar instalaciones GPS' })
  @ApiQuery({ name: 'vin', required: false })
  @ApiQuery({ name: 'serialNumber', required: false })
  @ApiQuery({ name: 'provider', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'replaced'] })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiResponse({
    status: 200,
    description: 'Listado paginado de instalaciones.',
  })
  async searchInstallations(@Query() query: FindGpsInstallationsQueryDto) {
    return this.gpsInstallationService.search(query);
  }

  @Get(':vin')
  @ApiOperation({ summary: 'Consultar instalacion activa por VIN' })
  @ApiParam({ name: 'vin', example: '3VW1E2JMXGM123456' })
  @ApiQuery({ name: 'provider', required: false, example: 'Proveedor GPS' })
  @ApiResponse({ status: 200, description: 'Instalacion activa encontrada.' })
  @ApiResponse({ status: 404, description: 'INSTALLATION_NOT_FOUND.' })
  async getActiveInstallation(
    @Param('vin') vin: string,
    @Query('provider') provider?: string,
  ) {
    return this.gpsInstallationService.findActiveByVin(vin, provider);
  }
}
