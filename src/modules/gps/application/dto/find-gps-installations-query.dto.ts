import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { GpsInstallationStatus } from '../../infrastructure/entities/gps-installation.orm-entity';

export class FindGpsInstallationsQueryDto {
  @IsOptional()
  @IsString()
  vin?: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsIn(Object.values(GpsInstallationStatus))
  status?: GpsInstallationStatus;

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
