import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import type { UserRepository } from 'src/modules/users/domain/repositories/user.repository';
import type { WialonAuthRepository } from '../repositories/wialon-auth.repository';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WialonSessionService {
  // Wialon SID expira cada 5 minutos sin actividad, usamos 4 como margen de seguridad
  private readonly SESSION_DURATION_MINUTES = 4;

  constructor(
    @Inject('UserRepository')
    private readonly userRepo: UserRepository,
    @Inject('WialonAuthRepository')
    private readonly wialonRepo: WialonAuthRepository,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Obtiene un SID válido. Si el SID está próximo a expirar o ya expiró,
   * lo renueva automáticamente. También actualiza el timestamp en cada uso.
   */
  async getValidSid(userId: string): Promise<string> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    // Si el SID es válido, extender su vida útil
    if (user.isWialonSidValid() && user.wialonSid) {
      // Actualizar el timestamp para extender la sesión
      await this.extendSession(userId, user.wialonSid);
      return user.wialonSid;
    }

    // Si no es válido o no existe, obtener uno nuevo
    return await this.refreshWialonSession(userId);
  }

  /**
   * Renueva la sesión de Wialon obteniendo un nuevo SID
   */
  async refreshWialonSession(userId: string): Promise<string> {
    const token = this.configService.get<string>('WIALON_TOKEN');
    if (!token) {
      throw new Error('WIALON_TOKEN is not configured');
    }

    const sid = await this.wialonRepo.loginWithToken(token);

    const expiryDate = new Date();
    expiryDate.setMinutes(
      expiryDate.getMinutes() + this.SESSION_DURATION_MINUTES,
    );

    await this.userRepo.updateWialonSession(userId, sid, expiryDate);

    return sid;
  }

  /**
   * Extiende la sesión actual actualizando el timestamp
   * Esto simula la actividad que mantiene vivo el SID en Wialon
   */
  private async extendSession(userId: string, sid: string): Promise<void> {
    const expiryDate = new Date();
    expiryDate.setMinutes(
      expiryDate.getMinutes() + this.SESSION_DURATION_MINUTES,
    );
    await this.userRepo.updateWialonSession(userId, sid, expiryDate);
  }

  async invalidateSession(userId: string): Promise<void> {
    await this.userRepo.updateWialonSession(userId, '', new Date());
  }
}
