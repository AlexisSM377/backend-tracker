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
import { JwtAuthGuard } from 'src/modules/auth/infrastructure/guards/jwt-auth.guard';
import { WialonSidInterceptor } from 'src/modules/wialon-auth/application/wialon-interceptor';
import { WialonSid } from 'src/modules/wialon-auth/infrastructure/http/wialon-sid';
import { ExecuteCommandDto } from '../../application/dto/execute-command.dto';
import { ExecuteUnitCommandDto } from '../../application/dto/execute-unit-command.dto';
import { NoReportQueryDto } from '../../application/dto/no-report-query.dto';
import { GpsCommandService } from '../../application/services/gps-command.service';
import { NoReportService } from '../../application/services/no-report.service';

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
  async getUnitCommands(
    @Param('unitId', ParseIntPipe) unitId: number,
    @WialonSid() sid: string,
  ) {
    return this.gpsCommandService.listUnitCommands(sid, unitId);
  }

  @Post('units/:unitId/commands/exec')
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
