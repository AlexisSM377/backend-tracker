import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  GpsInstallationAppointmentOrmEntity,
  GpsInstallationAppointmentStatus,
} from '../../infrastructure/entities/gps-installation-appointment.orm-entity';
import { AppointmentSlotService } from './appointment-slot.service';
import { GpsInstallationService } from './gps-installation.service';

interface CreateInstallationAppointmentInput {
  vin: string;
  provider: string;
  slotId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  notes?: string;
  userId?: string;
}

interface FindInstallationAppointmentsInput {
  vin?: string;
  provider?: string;
  status?: GpsInstallationAppointmentStatus;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

interface RescheduleInstallationAppointmentInput {
  slotId: string;
  notes?: string;
  userId?: string;
}

interface CancelInstallationAppointmentInput {
  notes?: string;
  userId?: string;
}

interface CompleteInstallationAppointmentInput {
  sid: string;
  serialNumber: string;
  installedAt?: string;
  notes?: string;
  userId?: string;
}

export interface InstallationResponse {
  id: string;
}

@Injectable()
export class InstallationAppointmentService {
  private readonly defaultPage = 1;
  private readonly defaultLimit = 50;
  private readonly maxLimit = 100;

  constructor(
    private readonly dataSource: DataSource,
    private readonly slotService: AppointmentSlotService,
    private readonly gpsInstallationService: GpsInstallationService,
    @InjectRepository(GpsInstallationAppointmentOrmEntity)
    private readonly appointmentRepository: Repository<GpsInstallationAppointmentOrmEntity>,
  ) {}

  async create(input: CreateInstallationAppointmentInput) {
    const normalized = this.normalizeCreateInput(input);
    this.ensureRequiredAppointmentData(normalized);

    const appointment = await this.dataSource.transaction(
      'SERIALIZABLE',
      async (manager) => {
        await this.slotService.reserveSlot(
          manager,
          normalized.slotId,
          normalized.provider,
        );

        const repository = manager.getRepository(
          GpsInstallationAppointmentOrmEntity,
        );

        return repository.save(
          repository.create({
            vin: normalized.vin,
            provider: normalized.provider,
            slotId: normalized.slotId,
            status: GpsInstallationAppointmentStatus.Scheduled,
            customerName: normalized.customerName,
            customerPhone: normalized.customerPhone,
            customerEmail: normalized.customerEmail,
            notes: normalized.notes,
            createdBy: normalized.userId || null,
            updatedBy: normalized.userId || null,
          }),
        );
      },
    );

    return this.findById(appointment.id);
  }

  async search(input: FindInstallationAppointmentsInput) {
    const page = input.page || this.defaultPage;
    const limit = Math.min(input.limit || this.defaultLimit, this.maxLimit);
    const query = this.appointmentRepository
      .createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.slot', 'slot')
      .orderBy('slot.startsAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (input.vin) {
      query.andWhere('appointment.vin = :vin', {
        vin: this.normalizeVin(input.vin),
      });
    }

    if (input.provider) {
      query.andWhere('appointment.provider = :provider', {
        provider: input.provider.trim(),
      });
    }

    if (input.status) {
      query.andWhere('appointment.status = :status', {
        status: input.status,
      });
    }

    if (input.from) {
      query.andWhere('slot.startsAt >= :from', { from: new Date(input.from) });
    }

    if (input.to) {
      query.andWhere('slot.startsAt <= :to', { to: new Date(input.to) });
    }

    const [items, total] = await query.getManyAndCount();

    return {
      page,
      limit,
      total,
      items: items.map((appointment) => this.toResponse(appointment)),
    };
  }

  async findById(id: string) {
    const appointment = await this.appointmentRepository.findOne({
      where: { id },
      relations: { slot: true },
    });

    if (!appointment) {
      throw this.appointmentNotFound(id);
    }

    return this.toResponse(appointment);
  }

  async reschedule(id: string, input: RescheduleInstallationAppointmentInput) {
    const appointment = await this.dataSource.transaction(
      'SERIALIZABLE',
      async (manager) => {
        const repository = manager.getRepository(
          GpsInstallationAppointmentOrmEntity,
        );
        const current = await repository.findOne({
          where: { id },
          lock: { mode: 'pessimistic_write' },
        });

        if (!current) {
          throw this.appointmentNotFound(id);
        }
        this.ensureCanChangeAppointment(current);

        if (current.slotId === input.slotId) {
          throw new ConflictException({
            success: false,
            error: 'APPOINTMENT_SAME_SLOT',
            message: 'La cita ya esta asignada al slot solicitado.',
          });
        }

        await this.slotService.reserveSlot(
          manager,
          input.slotId,
          current.provider,
        );
        await this.slotService.releaseSlot(manager, current.slotId);

        current.slotId = input.slotId;
        current.status = GpsInstallationAppointmentStatus.Rescheduled;
        current.rescheduledAt = new Date();
        current.notes = this.mergeNotes(current.notes, input.notes);
        current.updatedBy = input.userId || current.updatedBy;

        return repository.save(current);
      },
    );

    return this.findById(appointment.id);
  }

  async cancel(id: string, input: CancelInstallationAppointmentInput) {
    const appointment = await this.dataSource.transaction(
      'SERIALIZABLE',
      async (manager) => {
        const repository = manager.getRepository(
          GpsInstallationAppointmentOrmEntity,
        );
        const current = await repository.findOne({
          where: { id },
          lock: { mode: 'pessimistic_write' },
        });

        if (!current) {
          throw this.appointmentNotFound(id);
        }
        this.ensureCanChangeAppointment(current);

        await this.slotService.releaseSlot(manager, current.slotId);

        current.status = GpsInstallationAppointmentStatus.Cancelled;
        current.cancelledAt = new Date();
        current.notes = this.mergeNotes(current.notes, input.notes);
        current.updatedBy = input.userId || current.updatedBy;

        return repository.save(current);
      },
    );

    return this.findById(appointment.id);
  }

  async complete(id: string, input: CompleteInstallationAppointmentInput) {
    const current = await this.appointmentRepository.findOne({
      where: { id },
      relations: { slot: true },
    });

    if (!current) {
      throw this.appointmentNotFound(id);
    }
    this.ensureCanChangeAppointment(current);

    const normalizedSerialNumber = input.serialNumber.trim();
    if (!normalizedSerialNumber) {
      throw new BadRequestException({
        success: false,
        error: 'INVALID_APPOINTMENT_DATA',
        message: 'El numero de serie es requerido para completar la cita.',
      });
    }

    const installation = (await this.gpsInstallationService.create({
      sid: input.sid,
      vin: current.vin,
      provider: current.provider,
      serialNumber: normalizedSerialNumber,
      installedAt: input.installedAt,
    })) as InstallationResponse;

    const appointment = await this.dataSource.transaction(
      'SERIALIZABLE',
      async (manager) => {
        const repository = manager.getRepository(
          GpsInstallationAppointmentOrmEntity,
        );
        const locked = await repository.findOne({
          where: { id },
          lock: { mode: 'pessimistic_write' },
        });

        if (!locked) {
          throw this.appointmentNotFound(id);
        }
        this.ensureCanChangeAppointment(locked);

        locked.status = GpsInstallationAppointmentStatus.Completed;
        locked.serialNumber = normalizedSerialNumber;
        locked.completedAt = new Date();
        locked.installationId = installation.id;
        locked.notes = this.mergeNotes(locked.notes, input.notes);
        locked.updatedBy = input.userId || locked.updatedBy;

        return repository.save(locked);
      },
    );

    return {
      appointment: await this.findById(appointment.id),
      installation,
    };
  }

  private normalizeCreateInput(input: CreateInstallationAppointmentInput) {
    return {
      vin: this.normalizeVin(input.vin),
      provider: input.provider.trim(),
      slotId: input.slotId,
      customerName: input.customerName.trim(),
      customerPhone: input.customerPhone.trim(),
      customerEmail: input.customerEmail?.trim().toLowerCase() || null,
      notes: input.notes?.trim() || null,
      userId: input.userId,
    };
  }

  private normalizeVin(vin: string): string {
    return vin.trim().toUpperCase();
  }

  private ensureRequiredAppointmentData(input: {
    vin: string;
    provider: string;
    customerName: string;
    customerPhone: string;
  }): void {
    if (
      !input.vin ||
      !input.provider ||
      !input.customerName ||
      !input.customerPhone
    ) {
      throw new BadRequestException({
        success: false,
        error: 'INVALID_APPOINTMENT_DATA',
        message:
          'VIN, proveedor, nombre y telefono del cliente son requeridos.',
      });
    }
  }

  private ensureCanChangeAppointment(
    appointment: GpsInstallationAppointmentOrmEntity,
  ): void {
    if (appointment.status === GpsInstallationAppointmentStatus.Completed) {
      throw new ConflictException({
        success: false,
        error: 'APPOINTMENT_ALREADY_COMPLETED',
        message: 'La cita ya fue completada.',
      });
    }

    if (appointment.status === GpsInstallationAppointmentStatus.Cancelled) {
      throw new ConflictException({
        success: false,
        error: 'APPOINTMENT_ALREADY_CANCELLED',
        message: 'La cita ya fue cancelada.',
      });
    }
  }

  private mergeNotes(current: string | null, next?: string): string | null {
    const normalizedNext = next?.trim();
    if (!normalizedNext) {
      return current;
    }

    if (!current) {
      return normalizedNext;
    }

    return `${current}\n${normalizedNext}`;
  }

  private toResponse(appointment: GpsInstallationAppointmentOrmEntity) {
    return {
      id: appointment.id,
      vin: appointment.vin,
      provider: appointment.provider,
      slotId: appointment.slotId,
      status: appointment.status,
      customerName: appointment.customerName,
      customerPhone: appointment.customerPhone,
      customerEmail: appointment.customerEmail,
      notes: appointment.notes,
      serialNumber: appointment.serialNumber,
      completedAt: appointment.completedAt?.toISOString() || null,
      cancelledAt: appointment.cancelledAt?.toISOString() || null,
      rescheduledAt: appointment.rescheduledAt?.toISOString() || null,
      installationId: appointment.installationId,
      createdBy: appointment.createdBy,
      updatedBy: appointment.updatedBy,
      slot: appointment.slot
        ? this.slotService.toResponse(appointment.slot)
        : null,
      createdAt: appointment.createdAt.toISOString(),
      updatedAt: appointment.updatedAt.toISOString(),
    };
  }

  private appointmentNotFound(id: string): NotFoundException {
    return new NotFoundException({
      success: false,
      error: 'APPOINTMENT_NOT_FOUND',
      message: `No se encontro la cita ${id}.`,
    });
  }
}
