export interface WialonAuthRepository {
  loginWithToken(token: string): Promise<string>;
}
