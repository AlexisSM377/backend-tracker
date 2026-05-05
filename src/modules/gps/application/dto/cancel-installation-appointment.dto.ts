import { IsOptional, IsString } from 'class-validator';

export class CancelInstallationAppointmentDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
