import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ExecuteUnitCommandDto {
  @IsString()
  @IsNotEmpty()
  commandName: string;

  @IsString()
  @IsOptional()
  linkType?: string;

  @IsString()
  @IsOptional()
  param?: string;

  @IsString()
  @IsNotEmpty()
  userId: string;
}
