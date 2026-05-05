import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CancelInstallationAppointmentDto {
  @ApiPropertyOptional({ example: 'Cliente cancela' })
  @IsOptional()
  @IsString()
  notes?: string;
}
