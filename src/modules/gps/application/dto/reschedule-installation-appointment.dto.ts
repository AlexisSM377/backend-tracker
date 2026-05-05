import { IsOptional, IsString, IsUUID } from 'class-validator';

export class RescheduleInstallationAppointmentDto {
  @IsUUID()
  slotId: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
