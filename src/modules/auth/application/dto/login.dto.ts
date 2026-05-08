import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin' })
  @IsString({ message: 'Username is required' })
  username: string;

  @ApiProperty({ example: 'secret' })
  @IsString({ message: 'Password is required' })
  password: string;
}
