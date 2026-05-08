import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ExecuteUnitCommandDto {
  @ApiProperty({ example: 'Localizar' })
  @IsString()
  @IsNotEmpty()
  commandName: string;

  @ApiPropertyOptional({ example: 'tcp', default: 'tcp' })
  @IsString()
  @IsOptional()
  linkType?: string;

  @ApiPropertyOptional({ example: '' })
  @IsString()
  @IsOptional()
  param?: string;

  @ApiProperty({ example: 'ccc5cd29-7b46-435e-b517-11bb202c4d1d' })
  @IsString()
  @IsNotEmpty()
  userId: string;
}
