import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/infrastructure/guards/jwt-auth.guard';
import { WialonSidInterceptor } from 'src/modules/wialon-auth/application/wialon-interceptor';
import { WialonSid } from 'src/modules/wialon-auth/infrastructure/http/wialon-sid';
import { CancelInstallationAppointmentDto } from '../../application/dto/cancel-installation-appointment.dto';
import { CompleteInstallationAppointmentDto } from '../../application/dto/complete-installation-appointment.dto';
import { CreateInstallationAppointmentDto } from '../../application/dto/create-installation-appointment.dto';
import { FindInstallationAppointmentsQueryDto } from '../../application/dto/find-installation-appointments-query.dto';
import { RescheduleInstallationAppointmentDto } from '../../application/dto/reschedule-installation-appointment.dto';
import { InstallationAppointmentService } from '../../application/services/installation-appointment.service';

interface AuthenticatedRequest extends Request {
  user?: {
    userId?: string;
    username?: string;
  };
}

@Controller('gps/appointments')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class GpsInstallationAppointmentsController {
  constructor(
    private readonly installationAppointmentService: InstallationAppointmentService,
  ) {}

  @Post()
  async createAppointment(
    @Body() dto: CreateInstallationAppointmentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.installationAppointmentService.create({
      ...dto,
      userId: req.user?.userId,
    });
  }

  @Get()
  async searchAppointments(
    @Query() query: FindInstallationAppointmentsQueryDto,
  ) {
    return this.installationAppointmentService.search(query);
  }

  @Get(':id')
  async getAppointment(@Param('id') id: string) {
    return this.installationAppointmentService.findById(id);
  }

  @Patch(':id/reschedule')
  async rescheduleAppointment(
    @Param('id') id: string,
    @Body() dto: RescheduleInstallationAppointmentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.installationAppointmentService.reschedule(id, {
      ...dto,
      userId: req.user?.userId,
    });
  }

  @Patch(':id/cancel')
  async cancelAppointment(
    @Param('id') id: string,
    @Body() dto: CancelInstallationAppointmentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.installationAppointmentService.cancel(id, {
      ...dto,
      userId: req.user?.userId,
    });
  }

  @Patch(':id/complete')
  @UseInterceptors(WialonSidInterceptor)
  async completeAppointment(
    @Param('id') id: string,
    @Body() dto: CompleteInstallationAppointmentDto,
    @Req() req: AuthenticatedRequest,
    @WialonSid() sid: string,
  ) {
    return this.installationAppointmentService.complete(id, {
      sid,
      ...dto,
      userId: req.user?.userId,
    });
  }
}
