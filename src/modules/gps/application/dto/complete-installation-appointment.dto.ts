import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CompleteInstallationAppointmentDto {
  @IsString()
  @IsNotEmpty()
  serialNumber: string;

  @IsOptional()
  @IsDateString()
  installedAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
