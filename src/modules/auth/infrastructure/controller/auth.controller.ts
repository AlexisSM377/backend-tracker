import { Body, Controller, Post } from '@nestjs/common';
import { LoginUseCase } from '../../application/use-cases/login.usecase';
import { LoginDto } from '../../application/dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: LoginUseCase) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.execute(dto.username, dto.password);
  }
}
