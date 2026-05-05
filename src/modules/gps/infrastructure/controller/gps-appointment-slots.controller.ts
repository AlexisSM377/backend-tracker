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
import { JwtAuthGuard } from 'src/modules/auth/infrastructure/guards/jwt-auth.guard';
import { CreateAppointmentSlotDto } from '../../application/dto/create-appointment-slot.dto';
import { FindAppointmentSlotsQueryDto } from '../../application/dto/find-appointment-slots-query.dto';
import { UpdateAppointmentSlotDto } from '../../application/dto/update-appointment-slot.dto';
import { AppointmentSlotService } from '../../application/services/appointment-slot.service';

@Controller('gps/appointment-slots')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class GpsAppointmentSlotsController {
  constructor(
    private readonly appointmentSlotService: AppointmentSlotService,
  ) {}

  @Post()
  async createSlot(@Body() dto: CreateAppointmentSlotDto) {
    return this.appointmentSlotService.create(dto);
  }

  @Get()
  async searchSlots(@Query() query: FindAppointmentSlotsQueryDto) {
    return this.appointmentSlotService.search(query);
  }

  @Patch(':id')
  async updateSlot(
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentSlotDto,
  ) {
    return this.appointmentSlotService.update(id, dto);
  }
}
