import { Credentials } from '../value-objects/credenctials.vo';

export class OutgoingService {
  constructor(
    public readonly id: null,
    public readonly name: string,
    public readonly protocolId: number,
    public readonly credentials: Credentials,
  ) {}
}
