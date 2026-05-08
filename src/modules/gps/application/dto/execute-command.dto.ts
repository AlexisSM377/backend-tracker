import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ExecuteCommandDto {
  @ApiProperty({ example: '863238077362731' })
  @IsString()
  @IsNotEmpty()
  serialNumber: string;

  @ApiProperty({ example: 'ccc5cd29-7b46-435e-b517-11bb202c4d1d' })
  @IsString()
  @IsNotEmpty()
  userId: string;
}
