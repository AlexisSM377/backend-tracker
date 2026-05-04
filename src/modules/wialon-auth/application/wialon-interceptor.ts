import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { WialonSessionService } from '../domain/services/wialon-auth.service';

@Injectable()
export class WialonSidInterceptor implements NestInterceptor {
  constructor(private readonly wialonSessionService: WialonSessionService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const request = context.switchToHttp().getRequest();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const user = request.user;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (user && user.userId) {
      // Obtener o renovar el SID automáticamente
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      const sid = await this.wialonSessionService.getValidSid(user.userId);

      // Agregar el SID al request para que esté disponible en los controladores
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      request.wialonSid = sid;
    }

    return next.handle().pipe(
      // Capturar errores y verificar si es un error de SID inválido
      catchError((error: unknown) => {
        // Si es un error de Wialon indicando SID inválido, renovar e intentar de nuevo
        const response = (error as { response?: { error?: number } }).response;
        const isWialonError = response?.error === 1;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (isWialonError && user && user.userId) {
          // Forzar renovación del SID
          void this.wialonSessionService
            .refreshWialonSession(
              // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
              user.userId,
            )
            .then((newSid) => {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              request.wialonSid = newSid;
            });

          // Nota: Aquí podrías implementar un retry automático si lo necesitas
          // Por ahora solo renovamos el SID para la siguiente petición
        }

        return throwError(() => error);
      }),
    );
  }
}
