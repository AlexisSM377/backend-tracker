import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateInstallationAppointmentDto {
  @ApiProperty({ example: '3VW1E2JMXGM123456' })
  @IsString()
  @IsNotEmpty()
  vin: string;

  @ApiProperty({ example: 'Proveedor GPS' })
  @IsString()
  @IsNotEmpty()
  provider: string;

  @ApiProperty({ example: '8f38b48b-79a8-4e61-a82b-7ff1dc899bc2' })
  @IsUUID()
  slotId: string;

  @ApiProperty({ example: 'Juan Perez' })
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @ApiProperty({ example: '5555555555' })
  @IsString()
  @IsNotEmpty()
  customerPhone: string;

  @ApiPropertyOptional({ example: 'cliente@email.com' })
  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @ApiPropertyOptional({ example: 'Instalacion en agencia' })
  @IsOptional()
  @IsString()
  notes?: string;
}
