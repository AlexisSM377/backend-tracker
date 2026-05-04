import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WialonAuthRepository } from '../../domain/repositories/wialon-auth.repository';

@Injectable()
export class WialonHttpRepository implements WialonAuthRepository {
  private readonly apiUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('WIALON_API_URL') || '';
  }

  async loginWithToken(token: string): Promise<string> {
    try {
      const response = await fetch(
        `${this.apiUrl}?svc=token/login&params=${JSON.stringify({ token })}`,
        { method: 'POST' },
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const data = await response.json();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (data.error) {
        throw new HttpException(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          `Error de Wialon: ${data.error}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
      return data.eid; // El SID de Wialon se devuelve como 'eid'
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      throw new HttpException(
        'Error al conectar con Wialon',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
