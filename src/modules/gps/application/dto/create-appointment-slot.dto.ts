import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
} from 'class-validator';

export class CreateAppointmentSlotDto {
  @ApiProperty({ example: 'Proveedor GPS' })
  @IsString()
  @IsNotEmpty()
  provider: string;

  @ApiProperty({ example: '2026-05-10T15:00:00.000Z' })
  @IsDateString()
  startsAt: string;

  @ApiProperty({ example: '2026-05-10T16:00:00.000Z' })
  @IsDateString()
  endsAt: string;

  @ApiProperty({ example: 'Sucursal CDMX' })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  capacity: number;
}
