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
import { JwtAuthGuard } from 'src/modules/auth/infrastructure/guards/jwt-auth.guard';
import { WialonSidInterceptor } from 'src/modules/wialon-auth/application/wialon-interceptor';
import { WialonSid } from 'src/modules/wialon-auth/infrastructure/http/wialon-sid';
import { CreateGpsInstallationDto } from '../../application/dto/create-gps-installation.dto';
import { FindGpsInstallationsQueryDto } from '../../application/dto/find-gps-installations-query.dto';
import { GpsInstallationService } from '../../application/services/gps-installation.service';

@Controller('gps/installations')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class GpsInstallationsController {
  constructor(
    private readonly gpsInstallationService: GpsInstallationService,
  ) {}

  @Post()
  @UseInterceptors(WialonSidInterceptor)
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
  async searchInstallations(@Query() query: FindGpsInstallationsQueryDto) {
    return this.gpsInstallationService.search(query);
  }

  @Get(':vin')
  async getActiveInstallation(
    @Param('vin') vin: string,
    @Query('provider') provider?: string,
  ) {
    return this.gpsInstallationService.findActiveByVin(vin, provider);
  }
}
