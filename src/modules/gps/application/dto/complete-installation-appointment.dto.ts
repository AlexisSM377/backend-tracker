import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CompleteInstallationAppointmentDto {
  @ApiProperty({ example: '863238077362731' })
  @IsString()
  @IsNotEmpty()
  serialNumber: string;

  @ApiPropertyOptional({ example: '2026-05-10T16:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  installedAt?: string;

  @ApiPropertyOptional({ example: 'Instalacion completada' })
  @IsOptional()
  @IsString()
  notes?: string;
}
