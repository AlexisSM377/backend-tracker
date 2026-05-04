import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { WialonApiService } from 'src/modules/wialon-auth/application/services/wialon.service';
import { WialonSessionService } from 'src/modules/wialon-auth/domain/services/wialon-auth.service';
import { WialonUnit } from 'src/modules/types/type-wialon';
import { NoReportSnapshotOrmEntity } from '../../infrastructure/entities/no-report-snapshot.orm-entity';
import { GpsUnitResolverService } from './gps-unit-resolver.service';

@Injectable()
export class NoReportService implements OnModuleInit {
  private readonly defaultThresholdMinutes = 60;
  private readonly dayInMilliseconds = 24 * 60 * 60 * 1000;
  private readonly snapshotFreshnessMs = 15 * 60 * 1000;
  private snapshotGenerationPromise: Promise<void> | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly wialonSessionService: WialonSessionService,
    private readonly wialonApiService: WialonApiService,
    private readonly unitResolver: GpsUnitResolverService,
    @InjectRepository(NoReportSnapshotOrmEntity)
    private readonly snapshotRepository: Repository<NoReportSnapshotOrmEntity>,
  ) {}

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
    const response = await this.wialonApiService.searchUnits(
      sid,
      '*',
      16777215,
      0,
      0,
    );

    const units = response.items || [];
    const snapshots = units
      .map((unit) => this.toSnapshot(unit, generatedAt))
      .filter(
        (snapshot) =>
          (snapshot.minutesWithoutReport || 0) >= this.defaultThresholdMinutes,
      );

    if (snapshots.length > 0) {
      await this.snapshotRepository.save(snapshots);
    }

    return generatedAt;
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
    const generatedAt = await this.getLatestGeneratedAt();

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
  ): Partial<NoReportSnapshotOrmEntity> {
    const lastReportAt = this.getLastReportAt(unit);
    const minutesWithoutReport = lastReportAt
      ? Math.floor((generatedAt.getTime() - lastReportAt.getTime()) / 60000)
      : Number.MAX_SAFE_INTEGER;

    return {
      wialonUnitId: unit.id,
      unitName: unit.nm,
      serialNumber: this.unitResolver.getSerialNumber(unit),
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

  private async getLatestGeneratedAt(): Promise<Date | null> {
    const [latest] = await this.snapshotRepository.find({
      order: {
        generatedAt: 'DESC',
      },
      take: 1,
    });

    return latest?.generatedAt || null;
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
      .catch(() => undefined)
      .finally(() => {
        this.snapshotGenerationPromise = null;
      });
  }
}
