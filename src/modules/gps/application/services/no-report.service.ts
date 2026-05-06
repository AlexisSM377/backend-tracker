import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { WialonApiService } from 'src/modules/wialon-auth/application/services/wialon.service';
import { WialonSessionService } from 'src/modules/wialon-auth/domain/services/wialon-auth.service';
import { WialonUnit } from 'src/modules/types/type-wialon';
import {
  GpsInstallationOrmEntity,
  GpsInstallationStatus,
} from '../../infrastructure/entities/gps-installation.orm-entity';
import {
  NoReportSnapshotRunOrmEntity,
  NoReportSnapshotRunStatus,
} from '../../infrastructure/entities/no-report-snapshot-run.orm-entity';
import { NoReportSnapshotOrmEntity } from '../../infrastructure/entities/no-report-snapshot.orm-entity';
import { GpsUnitResolverService } from './gps-unit-resolver.service';

@Injectable()
export class NoReportService implements OnModuleInit {
  private readonly logger = new Logger(NoReportService.name);
  private readonly defaultThresholdMinutes = 60;
  private readonly dayInMilliseconds = 24 * 60 * 60 * 1000;
  private readonly snapshotFreshnessMs = 15 * 60 * 1000;
  private readonly unknownLastReportMinutes = 2147483647;
  private readonly unitSearchFlags: number;
  private readonly unitSearchBatchSize: number;
  private snapshotGenerationPromise: Promise<void> | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly wialonSessionService: WialonSessionService,
    private readonly wialonApiService: WialonApiService,
    private readonly unitResolver: GpsUnitResolverService,
    @InjectRepository(GpsInstallationOrmEntity)
    private readonly installationRepository: Repository<GpsInstallationOrmEntity>,
    @InjectRepository(NoReportSnapshotRunOrmEntity)
    private readonly snapshotRunRepository: Repository<NoReportSnapshotRunOrmEntity>,
    @InjectRepository(NoReportSnapshotOrmEntity)
    private readonly snapshotRepository: Repository<NoReportSnapshotOrmEntity>,
  ) {
    this.unitSearchFlags = this.parsePositiveInteger(
      this.configService.get<string>('WIALON_NO_REPORT_UNIT_FLAGS'),
      2097153,
    );
    this.unitSearchBatchSize = this.parsePositiveInteger(
      this.configService.get<string>('WIALON_NO_REPORT_BATCH_SIZE'),
      100,
    );
  }

  onModuleInit(): void {
    const oneMinute = 60 * 1000;
    setTimeout(() => {
      void this.generateSnapshotForSystemUsers();
      setInterval(
        () => void this.generateSnapshotForSystemUsers(),
        this.dayInMilliseconds,
      );
    }, oneMinute);
  }

  async generateSnapshot(sid: string): Promise<Date> {
    const generatedAt = new Date();
    try {
      const installations = await this.installationRepository.find({
        where: {
          status: GpsInstallationStatus.Active,
        },
      });
      const units = await this.loadInstalledUnits(sid, installations);
      const installationsByUnitId = new Map(
        installations.map((installation) => [
          installation.wialonUnitId,
          installation,
        ]),
      );

      const snapshots = units
        .map((unit) =>
          this.toSnapshot(
            unit,
            generatedAt,
            installationsByUnitId.get(unit.id),
          ),
        )
        .filter(
          (snapshot) =>
            (snapshot.minutesWithoutReport || 0) >=
            this.defaultThresholdMinutes,
        );

      await this.snapshotRunRepository.save({
        generatedAt,
        status: NoReportSnapshotRunStatus.Completed,
        thresholdMinutes: this.defaultThresholdMinutes,
        totalUnitsChecked: units.length,
        totalUnitsWithoutReport: snapshots.length,
        errorMessage: null,
      });

      if (snapshots.length > 0) {
        await this.snapshotRepository.save(snapshots);
      }

      return generatedAt;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';

      await this.snapshotRunRepository.save({
        generatedAt,
        status: NoReportSnapshotRunStatus.Failed,
        thresholdMinutes: this.defaultThresholdMinutes,
        totalUnitsChecked: 0,
        totalUnitsWithoutReport: 0,
        errorMessage,
      });

      this.logger.error(
        `No se pudo generar snapshot no-reporta: ${errorMessage}`,
      );
      throw error;
    }
  }

  async findLatest(input: {
    sid: string;
    minMinutes?: number;
    page?: number;
    limit?: number;
  }) {
    const page = input.page || 1;
    const limit = input.limit || 50;
    const minMinutes = input.minMinutes || 0;
    const latestRun = await this.getLatestRun();
    const generatedAt = latestRun?.generatedAt || null;

    if (!generatedAt) {
      this.queueSnapshotGeneration(input.sid);
      return {
        generatedAt: null,
        total: 0,
        units: [],
        status: 'processing',
        message:
          'No existe snapshot aun. Se inicio generacion en segundo plano.',
      };
    }

    if (latestRun?.status === NoReportSnapshotRunStatus.Failed) {
      this.queueSnapshotGeneration(input.sid);
      return {
        generatedAt: generatedAt.toISOString(),
        total: 0,
        units: [],
        status: 'failed',
        message: 'La ultima generacion de no-reporta fallo.',
        snapshot: {
          status: latestRun.status,
          thresholdMinutes: latestRun.thresholdMinutes,
          totalUnitsChecked: latestRun.totalUnitsChecked,
          totalUnitsWithoutReport: latestRun.totalUnitsWithoutReport,
          errorMessage: latestRun.errorMessage,
        },
      };
    }

    if (this.isSnapshotStale(generatedAt)) {
      this.queueSnapshotGeneration(input.sid);
    }

    const [units, total] = await this.snapshotRepository.findAndCount({
      where: {
        generatedAt,
        minutesWithoutReport: MoreThanOrEqual(minMinutes),
      },
      order: {
        minutesWithoutReport: 'DESC',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      generatedAt: generatedAt.toISOString(),
      total,
      status: this.isSnapshotStale(generatedAt) ? 'stale' : 'ready',
      snapshot: latestRun
        ? {
            status: latestRun.status,
            thresholdMinutes: latestRun.thresholdMinutes,
            totalUnitsChecked: latestRun.totalUnitsChecked,
            totalUnitsWithoutReport: latestRun.totalUnitsWithoutReport,
            errorMessage: latestRun.errorMessage,
          }
        : null,
      units: units.map((unit) => ({
        wialonUnitId: unit.wialonUnitId,
        unitName: unit.unitName,
        serialNumber: unit.serialNumber,
        lastReportAt: unit.lastReportAt?.toISOString() || null,
        minutesWithoutReport: unit.minutesWithoutReport,
        lastKnownLocation: unit.lastKnownLocation,
      })),
    };
  }

  private toSnapshot(
    unit: WialonUnit,
    generatedAt: Date,
    installation?: GpsInstallationOrmEntity,
  ): Partial<NoReportSnapshotOrmEntity> {
    const lastReportAt = this.getLastReportAt(unit);
    const minutesWithoutReport = lastReportAt
      ? Math.floor((generatedAt.getTime() - lastReportAt.getTime()) / 60000)
      : this.unknownLastReportMinutes;

    return {
      wialonUnitId: unit.id,
      unitName: unit.nm,
      serialNumber:
        installation?.serialNumber || this.unitResolver.getSerialNumber(unit),
      lastReportAt,
      minutesWithoutReport,
      lastKnownLocation: unit.pos
        ? {
            lat: unit.pos.y,
            lon: unit.pos.x,
            speed: unit.pos.s,
          }
        : null,
      generatedAt,
    };
  }

  private getLastReportAt(unit: WialonUnit): Date | null {
    const timestamp = unit.lmsg?.t || unit.pos?.t;
    return timestamp ? new Date(timestamp * 1000) : null;
  }

  private async loadInstalledUnits(
    sid: string,
    installations: GpsInstallationOrmEntity[],
  ): Promise<WialonUnit[]> {
    const uniqueUnitIds = [
      ...new Set(
        installations
          .map((installation) => installation.wialonUnitId)
          .filter((unitId) => Number.isInteger(unitId)),
      ),
    ];

    if (uniqueUnitIds.length === 0) {
      return [];
    }

    const units: WialonUnit[] = [];
    for (
      let index = 0;
      index < uniqueUnitIds.length;
      index += this.unitSearchBatchSize
    ) {
      const batch = uniqueUnitIds.slice(index, index + this.unitSearchBatchSize);
      const response = await this.wialonApiService.searchUnitsByIds(
        sid,
        batch,
        this.unitSearchFlags,
      );
      units.push(...(response.items || []));
    }

    return units;
  }

  private async getLatestRun(): Promise<NoReportSnapshotRunOrmEntity | null> {
    const [latest] = await this.snapshotRunRepository.find({
      order: {
        generatedAt: 'DESC',
      },
      take: 1,
    });

    return latest || null;
  }

  private async generateSnapshotForSystemUsers(): Promise<void> {
    const systemUserId = this.configService.get<string>(
      'WIALON_SYSTEM_USER_ID',
    );
    if (!systemUserId) {
      return;
    }

    const sid = await this.wialonSessionService.getValidSid(systemUserId);
    await this.generateSnapshot(sid);
  }

  private isSnapshotStale(generatedAt: Date): boolean {
    return Date.now() - generatedAt.getTime() > this.snapshotFreshnessMs;
  }

  private queueSnapshotGeneration(sid: string): void {
    if (this.snapshotGenerationPromise) {
      return;
    }

    this.snapshotGenerationPromise = this.generateSnapshot(sid)
      .then(() => undefined)
      .catch((error) => {
        const message =
          error instanceof Error ? error.message : 'Error desconocido';
        this.logger.error(`Snapshot no-reporta fallido: ${message}`);
      })
      .finally(() => {
        this.snapshotGenerationPromise = null;
      });
  }

  private parsePositiveInteger(
    value: string | undefined,
    fallback: number,
  ): number {
    const parsed = Number.parseInt(value || '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }
}
