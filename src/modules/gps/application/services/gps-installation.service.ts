import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  GpsInstallationOrmEntity,
  GpsInstallationStatus,
} from '../../infrastructure/entities/gps-installation.orm-entity';
import { GpsUnitResolverService } from './gps-unit-resolver.service';

interface CreateInstallationInput {
  sid: string;
  vin: string;
  serialNumber: string;
  provider: string;
  installedAt?: string;
}

interface SearchInstallationsInput {
  vin?: string;
  serialNumber?: string;
  provider?: string;
  status?: GpsInstallationStatus;
  page?: number;
  limit?: number;
}

@Injectable()
export class GpsInstallationService {
  private readonly defaultPage = 1;
  private readonly defaultLimit = 50;
  private readonly maxLimit = 100;

  constructor(
    private readonly dataSource: DataSource,
    private readonly unitResolver: GpsUnitResolverService,
    @InjectRepository(GpsInstallationOrmEntity)
    private readonly installationRepository: Repository<GpsInstallationOrmEntity>,
  ) {}

  async create(input: CreateInstallationInput) {
    const normalized = {
      vin: this.normalizeVin(input.vin),
      serialNumber: input.serialNumber.trim(),
      provider: input.provider.trim(),
      installedAt: input.installedAt ? new Date(input.installedAt) : new Date(),
    };
    this.ensureRequiredValues(normalized);

    const unit = await this.unitResolver.findBySerialNumber(
      input.sid,
      normalized.serialNumber,
    );
    const wialonUnitId = Number.parseInt(String(unit.id), 10);
    if (!Number.isFinite(wialonUnitId) || wialonUnitId <= 0 || !unit.nm) {
      throw new BadGatewayException({
        success: false,
        error: 'WIALON_UNIT_INVALID',
        message:
          'La unidad encontrada en Wialon no tiene datos suficientes para registrar la instalacion.',
      });
    }

    try {
      const installation = await this.dataSource.transaction(
        'SERIALIZABLE',
        async (manager) => {
          const repository = manager.getRepository(GpsInstallationOrmEntity);
          const activeInstallation = await repository.findOne({
            where: {
              vin: normalized.vin,
              status: GpsInstallationStatus.Active,
            },
            lock: { mode: 'pessimistic_write' },
          });

          if (
            activeInstallation &&
            activeInstallation.serialNumber === normalized.serialNumber &&
            activeInstallation.provider === normalized.provider
          ) {
            throw new ConflictException({
              success: false,
              error: 'INSTALLATION_ALREADY_ACTIVE',
              message:
                'El VIN ya tiene activa una instalacion con el mismo GPS y proveedor.',
            });
          }

          if (activeInstallation) {
            activeInstallation.status = GpsInstallationStatus.Replaced;
            activeInstallation.replacedAt = new Date();
            await repository.save(activeInstallation);
          }

          return repository.save(
            repository.create({
              vin: normalized.vin,
              serialNumber: normalized.serialNumber,
              provider: normalized.provider,
              status: GpsInstallationStatus.Active,
              wialonUnitId,
              wialonUnitName: unit.nm,
              installedAt: normalized.installedAt,
              replacedAt: null,
            }),
          );
        },
      );

      return this.toResponse(installation);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      if (this.isUniqueViolation(error)) {
        throw new ConflictException({
          success: false,
          error: 'INSTALLATION_ACTIVE_CONFLICT',
          message:
            'El VIN ya tiene una instalacion activa. Intente nuevamente.',
        });
      }

      throw error;
    }
  }

  async findActiveByVin(vin: string, provider?: string) {
    const normalizedVin = this.normalizeVin(vin);
    const normalizedProvider = provider?.trim();
    const installation = await this.installationRepository.findOne({
      where: {
        vin: normalizedVin,
        status: GpsInstallationStatus.Active,
        ...(normalizedProvider ? { provider: normalizedProvider } : {}),
      },
    });

    if (!installation) {
      throw new NotFoundException({
        success: false,
        error: 'INSTALLATION_NOT_FOUND',
        message: normalizedProvider
          ? `No se encontro instalacion activa para el VIN ${normalizedVin} y proveedor ${normalizedProvider}.`
          : `No se encontro instalacion activa para el VIN ${normalizedVin}.`,
      });
    }

    return this.toResponse(installation);
  }

  async search(input: SearchInstallationsInput) {
    const page = input.page || this.defaultPage;
    const limit = Math.min(input.limit || this.defaultLimit, this.maxLimit);
    const query = this.installationRepository
      .createQueryBuilder('installation')
      .orderBy('installation.installedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (input.vin) {
      query.andWhere('installation.vin = :vin', {
        vin: this.normalizeVin(input.vin),
      });
    }

    if (input.serialNumber) {
      query.andWhere('installation.serialNumber = :serialNumber', {
        serialNumber: input.serialNumber.trim(),
      });
    }

    if (input.provider) {
      query.andWhere('installation.provider = :provider', {
        provider: input.provider.trim(),
      });
    }

    if (input.status) {
      query.andWhere('installation.status = :status', {
        status: input.status,
      });
    }

    const [items, total] = await query.getManyAndCount();

    return {
      page,
      limit,
      total,
      items: items.map((item) => this.toResponse(item)),
    };
  }

  private normalizeVin(vin: string): string {
    return vin.trim().toUpperCase();
  }

  private ensureRequiredValues(input: {
    vin: string;
    serialNumber: string;
    provider: string;
  }): void {
    if (!input.vin || !input.serialNumber || !input.provider) {
      throw new BadRequestException({
        success: false,
        error: 'INVALID_INSTALLATION_DATA',
        message: 'VIN, numero de serie y proveedor son requeridos.',
      });
    }
  }

  private toResponse(installation: GpsInstallationOrmEntity) {
    return {
      id: installation.id,
      vin: installation.vin,
      serialNumber: installation.serialNumber,
      provider: installation.provider,
      status: installation.status,
      wialonUnitId: installation.wialonUnitId,
      wialonUnitName: installation.wialonUnitName,
      installedAt: installation.installedAt.toISOString(),
      replacedAt: installation.replacedAt?.toISOString() || null,
      createdAt: installation.createdAt.toISOString(),
      updatedAt: installation.updatedAt.toISOString(),
    };
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === '23505'
    );
  }
}
