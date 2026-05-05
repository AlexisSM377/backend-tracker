import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateGpsInstallationDto {
  @ApiProperty({ example: '3VW1E2JMXGM123456' })
  @IsString()
  @IsNotEmpty()
  vin: string;

  @ApiProperty({ example: '863238077362731' })
  @IsString()
  @IsNotEmpty()
  serialNumber: string;

  @ApiProperty({ example: 'Proveedor GPS' })
  @IsString()
  @IsNotEmpty()
  provider: string;

  @ApiPropertyOptional({ example: '2026-05-04T12:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  installedAt?: string;
}
