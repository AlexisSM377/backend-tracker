import { IsNotEmpty, IsString } from 'class-validator';

export class ExecuteCommandDto {
  @IsString()
  @IsNotEmpty()
  serialNumber: string;

  @IsString()
  @IsNotEmpty()
  userId: string;
}
