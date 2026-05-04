import { Body, Controller, Post } from '@nestjs/common';
import { RegisterUserUseCase } from '../../application/use-cases/register-user.usecase';
import { CreateUserDto } from '../../application/dto/create-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly registerUser: RegisterUserUseCase) {}

  @Post('register')
  async register(@Body() dto: CreateUserDto) {
    const user = await this.registerUser.execute(dto.username, dto.password);
    return { message: 'User registered successfully', user };
  }

  //     @UseGuards(JwtA)
  //   @Get('me')
  //   getProfile(@Req() req) {
  //     return req.user;
  //   }
}
