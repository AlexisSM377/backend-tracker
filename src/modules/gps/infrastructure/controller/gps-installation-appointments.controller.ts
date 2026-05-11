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

@ApiTags('Agendar cita de instalacion GPS')
@ApiBearerAuth('jwt')
@Controller('gps/appointments')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class GpsInstallationAppointmentsController {
  constructor(
    private readonly installationAppointmentService: InstallationAppointmentService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Agendar cita de instalacion GPS' })
  @ApiBody({ type: CreateInstallationAppointmentDto })
  @ApiResponse({ status: 201, description: 'Cita creada y cupo reservado.' })
  @ApiResponse({ status: 404, description: 'SLOT_NOT_FOUND.' })
  @ApiResponse({ status: 409, description: 'SLOT_NOT_AVAILABLE.' })
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
  @ApiOperation({ summary: 'Buscar citas de instalacion' })
  @ApiQuery({ name: 'vin', required: false })
  @ApiQuery({ name: 'provider', required: false })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['scheduled', 'cancelled', 'rescheduled', 'completed'],
  })
  @ApiQuery({
    name: 'from',
    required: false,
    example: '2026-05-10T00:00:00.000Z',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    example: '2026-05-31T23:59:59.999Z',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiResponse({ status: 200, description: 'Listado paginado de citas.' })
  async searchAppointments(
    @Query() query: FindInstallationAppointmentsQueryDto,
  ) {
    return this.installationAppointmentService.search(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar detalle de cita' })
  @ApiParam({ name: 'id', description: 'UUID de la cita.' })
  @ApiResponse({ status: 200, description: 'Detalle de cita con slot.' })
  @ApiResponse({ status: 404, description: 'APPOINTMENT_NOT_FOUND.' })
  async getAppointment(@Param('id') id: string) {
    return this.installationAppointmentService.findById(id);
  }

  @Patch(':id/reschedule')
  @ApiOperation({ summary: 'Reagendar cita a otro slot disponible' })
  @ApiParam({ name: 'id', description: 'UUID de la cita.' })
  @ApiBody({ type: RescheduleInstallationAppointmentDto })
  @ApiResponse({
    status: 200,
    description: 'Cita reagendada y cupos actualizados.',
  })
  @ApiResponse({
    status: 409,
    description: 'Cita no editable o slot no disponible.',
  })
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
  @ApiOperation({ summary: 'Cancelar cita y liberar cupo' })
  @ApiParam({ name: 'id', description: 'UUID de la cita.' })
  @ApiBody({ type: CancelInstallationAppointmentDto })
  @ApiResponse({ status: 200, description: 'Cita cancelada.' })
  @ApiResponse({ status: 409, description: 'Cita ya completada o cancelada.' })
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
  @ApiOperation({ summary: 'Completar cita y registrar instalacion GPS' })
  @ApiParam({ name: 'id', description: 'UUID de la cita.' })
  @ApiBody({ type: CompleteInstallationAppointmentDto })
  @ApiResponse({
    status: 200,
    description: 'Cita completada e instalacion creada.',
  })
  @ApiResponse({
    status: 404,
    description: 'APPOINTMENT_NOT_FOUND o UNIT_NOT_FOUND.',
  })
  @ApiResponse({
    status: 409,
    description: 'Cita no editable o instalacion ya activa.',
  })
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
