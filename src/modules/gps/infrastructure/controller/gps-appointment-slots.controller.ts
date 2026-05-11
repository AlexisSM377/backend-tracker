import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
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
import { CreateAppointmentSlotDto } from '../../application/dto/create-appointment-slot.dto';
import { FindAppointmentSlotsQueryDto } from '../../application/dto/find-appointment-slots-query.dto';
import { UpdateAppointmentSlotDto } from '../../application/dto/update-appointment-slot.dto';
import { AppointmentSlotService } from '../../application/services/appointment-slot.service';

@ApiTags('Crear disponibilidad de instalacion por proveedor')
@ApiBearerAuth('jwt')
@Controller('gps/appointment-slots')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class GpsAppointmentSlotsController {
  constructor(
    private readonly appointmentSlotService: AppointmentSlotService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Crear disponibilidad de instalacion por proveedor',
  })
  @ApiBody({ type: CreateAppointmentSlotDto })
  @ApiResponse({ status: 201, description: 'Slot creado.' })
  async createSlot(@Body() dto: CreateAppointmentSlotDto) {
    return this.appointmentSlotService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar slots de agenda' })
  @ApiQuery({ name: 'provider', required: false })
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
  @ApiQuery({ name: 'availableOnly', required: false, example: true })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiResponse({ status: 200, description: 'Listado paginado de slots.' })
  async searchSlots(@Query() query: FindAppointmentSlotsQueryDto) {
    return this.appointmentSlotService.search(query);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar slot de agenda' })
  @ApiParam({ name: 'id', description: 'UUID del slot.' })
  @ApiBody({ type: UpdateAppointmentSlotDto })
  @ApiResponse({ status: 200, description: 'Slot actualizado.' })
  @ApiResponse({
    status: 409,
    description: 'Capacidad menor al cupo reservado.',
  })
  async updateSlot(
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentSlotDto,
  ) {
    return this.appointmentSlotService.update(id, dto);
  }
}
