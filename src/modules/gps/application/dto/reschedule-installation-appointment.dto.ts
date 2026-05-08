import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class RescheduleInstallationAppointmentDto {
  @ApiProperty({ example: '8f38b48b-79a8-4e61-a82b-7ff1dc899bc2' })
  @IsUUID()
  slotId: string;

  @ApiPropertyOptional({ example: 'Cliente solicita nuevo horario' })
  @IsOptional()
  @IsString()
  notes?: string;
}
