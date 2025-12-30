import { IsString } from 'class-validator';

export class LoginDto {
  @IsString({ message: 'Username is required' })
  username: string;

  @IsString({ message: 'Password is required' })
  password: string;
}
