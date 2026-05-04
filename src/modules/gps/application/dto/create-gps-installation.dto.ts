import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateGpsInstallationDto {
  @IsString()
  @IsNotEmpty()
  vin: string;

  @IsString()
  @IsNotEmpty()
  serialNumber: string;

  @IsString()
  @IsNotEmpty()
  provider: string;

  @IsOptional()
  @IsDateString()
  installedAt?: string;
}
