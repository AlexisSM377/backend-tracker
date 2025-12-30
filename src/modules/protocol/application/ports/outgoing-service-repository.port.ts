import { OutgoingService } from '../../domain/entities/outgoing-service.entity';

export interface OutgoingServiceRepositoryPort {
  save(service: OutgoingService): Promise<OutgoingService>;
}
