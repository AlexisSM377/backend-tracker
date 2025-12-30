import { IsNotEmpty, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty({ message: 'El nombre de usuario es obligatorio' })
  username: string;

  @MinLength(10, { message: 'La contraseña debe tener al menos 10 caracteres' })
  password: string;
}
