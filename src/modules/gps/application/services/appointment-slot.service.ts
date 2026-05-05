import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { GpsAppointmentSlotOrmEntity } from '../../infrastructure/entities/gps-appointment-slot.orm-entity';

interface CreateAppointmentSlotInput {
  provider: string;
  startsAt: string;
  endsAt: string;
  location: string;
  capacity: number;
}

interface FindAppointmentSlotsInput {
  provider?: string;
  from?: string;
  to?: string;
  availableOnly?: boolean;
  page?: number;
  limit?: number;
}

interface UpdateAppointmentSlotInput {
  startsAt?: string;
  endsAt?: string;
  location?: string;
  capacity?: number;
  isActive?: boolean;
}

@Injectable()
export class AppointmentSlotService {
  private readonly defaultPage = 1;
  private readonly defaultLimit = 50;
  private readonly maxLimit = 100;

  constructor(
    @InjectRepository(GpsAppointmentSlotOrmEntity)
    private readonly slotRepository: Repository<GpsAppointmentSlotOrmEntity>,
  ) {}

  async create(input: CreateAppointmentSlotInput) {
    const normalized = {
      provider: input.provider.trim(),
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      location: input.location.trim(),
      capacity: input.capacity,
    };
    this.ensureValidSlotData(normalized);

    const slot = await this.slotRepository.save(
      this.slotRepository.create({
        ...normalized,
        reservedCount: 0,
        isActive: true,
      }),
    );

    return this.toResponse(slot);
  }

  async search(input: FindAppointmentSlotsInput) {
    const page = input.page || this.defaultPage;
    const limit = Math.min(input.limit || this.defaultLimit, this.maxLimit);
    const query = this.slotRepository
      .createQueryBuilder('slot')
      .orderBy('slot.startsAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (input.provider) {
      query.andWhere('slot.provider = :provider', {
        provider: input.provider.trim(),
      });
    }

    if (input.from) {
      query.andWhere('slot.startsAt >= :from', { from: new Date(input.from) });
    }

    if (input.to) {
      query.andWhere('slot.startsAt <= :to', { to: new Date(input.to) });
    }

    if (input.availableOnly) {
      query
        .andWhere('slot.isActive = :isActive', { isActive: true })
        .andWhere('slot.reservedCount < slot.capacity');
    }

    const [items, total] = await query.getManyAndCount();

    return {
      page,
      limit,
      total,
      items: items.map((slot) => this.toResponse(slot)),
    };
  }

  async update(id: string, input: UpdateAppointmentSlotInput) {
    const slot = await this.slotRepository.findOne({ where: { id } });
    if (!slot) {
      throw this.slotNotFound(id);
    }

    const startsAt = input.startsAt ? new Date(input.startsAt) : slot.startsAt;
    const endsAt = input.endsAt ? new Date(input.endsAt) : slot.endsAt;
    const location =
      input.location !== undefined ? input.location.trim() : slot.location;
    const capacity = input.capacity ?? slot.capacity;

    this.ensureValidSlotData({
      provider: slot.provider,
      startsAt,
      endsAt,
      location,
      capacity,
    });

    if (capacity < slot.reservedCount) {
      throw new ConflictException({
        success: false,
        error: 'SLOT_CAPACITY_BELOW_RESERVED',
        message:
          'La capacidad no puede ser menor al numero de citas reservadas.',
      });
    }

    slot.startsAt = startsAt;
    slot.endsAt = endsAt;
    slot.location = location;
    slot.capacity = capacity;
    if (input.isActive !== undefined) {
      slot.isActive = input.isActive;
    }

    return this.toResponse(await this.slotRepository.save(slot));
  }

  async reserveSlot(
    manager: EntityManager,
    slotId: string,
    provider?: string,
  ): Promise<GpsAppointmentSlotOrmEntity> {
    const repository = manager.getRepository(GpsAppointmentSlotOrmEntity);
    const slot = await repository.findOne({
      where: { id: slotId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!slot) {
      throw this.slotNotFound(slotId);
    }

    if (provider && slot.provider !== provider.trim()) {
      throw new ConflictException({
        success: false,
        error: 'SLOT_PROVIDER_MISMATCH',
        message: 'El slot no pertenece al proveedor solicitado.',
      });
    }

    if (!slot.isActive || slot.reservedCount >= slot.capacity) {
      throw new ConflictException({
        success: false,
        error: 'SLOT_NOT_AVAILABLE',
        message: 'El slot seleccionado no tiene cupo disponible.',
      });
    }

    slot.reservedCount += 1;
    return repository.save(slot);
  }

  async releaseSlot(
    manager: EntityManager,
    slotId: string,
  ): Promise<GpsAppointmentSlotOrmEntity> {
    const repository = manager.getRepository(GpsAppointmentSlotOrmEntity);
    const slot = await repository.findOne({
      where: { id: slotId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!slot) {
      throw this.slotNotFound(slotId);
    }

    slot.reservedCount = Math.max(0, slot.reservedCount - 1);
    return repository.save(slot);
  }

  toResponse(slot: GpsAppointmentSlotOrmEntity) {
    return {
      id: slot.id,
      provider: slot.provider,
      startsAt: slot.startsAt.toISOString(),
      endsAt: slot.endsAt.toISOString(),
      location: slot.location,
      capacity: slot.capacity,
      reservedCount: slot.reservedCount,
      availableCount: Math.max(0, slot.capacity - slot.reservedCount),
      isActive: slot.isActive,
      createdAt: slot.createdAt.toISOString(),
      updatedAt: slot.updatedAt.toISOString(),
    };
  }

  private ensureValidSlotData(input: {
    provider: string;
    startsAt: Date;
    endsAt: Date;
    location: string;
    capacity: number;
  }): void {
    if (!input.provider || !input.location) {
      throw new BadRequestException({
        success: false,
        error: 'INVALID_SLOT_DATA',
        message: 'Proveedor y ubicacion son requeridos.',
      });
    }

    if (
      Number.isNaN(input.startsAt.getTime()) ||
      Number.isNaN(input.endsAt.getTime()) ||
      input.endsAt <= input.startsAt
    ) {
      throw new BadRequestException({
        success: false,
        error: 'INVALID_SLOT_DATES',
        message: 'La fecha de fin debe ser mayor a la fecha de inicio.',
      });
    }

    if (!Number.isInteger(input.capacity) || input.capacity < 1) {
      throw new BadRequestException({
        success: false,
        error: 'INVALID_SLOT_CAPACITY',
        message: 'La capacidad del slot debe ser al menos 1.',
      });
    }
  }

  private slotNotFound(slotId: string): NotFoundException {
    return new NotFoundException({
      success: false,
      error: 'SLOT_NOT_FOUND',
      message: `No se encontro el slot ${slotId}.`,
    });
  }
}
