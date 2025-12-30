import { OutgoingService } from '../../domain/entities/outgoing-service.entity';
import { Credentials } from '../../domain/value-objects/credenctials.vo';
import { OutgoingServiceRepositoryPort } from '../ports/outgoing-service-repository.port';

export class CreateOutgoingServiceUseCase {
  constructor(private repo: OutgoingServiceRepositoryPort) {}

  async execute(input: {
    name: string;
    protocolId: number;
    credentials: Record<string, unknown>;
  }): Promise<OutgoingService> {
    const service = new OutgoingService(
      null,
      input.name,
      input.protocolId,
      new Credentials(input.credentials),
    );
    return this.repo.save(service);
  }
}
