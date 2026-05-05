import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LoginUseCase } from '../../application/use-cases/login.usecase';
import { LoginDto } from '../../application/dto/login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: LoginUseCase) {}

  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesion y obtener JWT' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 201, description: 'Login exitoso.' })
  @ApiResponse({ status: 401, description: 'Credenciales invalidas.' })
  async login(@Body() dto: LoginDto) {
    return this.authService.execute(dto.username, dto.password);
  }
}
