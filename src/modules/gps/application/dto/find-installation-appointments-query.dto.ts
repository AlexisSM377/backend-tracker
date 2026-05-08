import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { GpsInstallationAppointmentStatus } from '../../infrastructure/entities/gps-installation-appointment.orm-entity';

export class FindInstallationAppointmentsQueryDto {
  @IsOptional()
  @IsString()
  vin?: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsIn(Object.values(GpsInstallationAppointmentStatus))
  status?: GpsInstallationAppointmentStatus;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  limit?: number;
}
