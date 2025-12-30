import { Protocol } from '../../domain/entities/protocol.entity';

export interface ProtocolRepositoryPort {
  findAll(): Promise<Protocol[]>;
}
