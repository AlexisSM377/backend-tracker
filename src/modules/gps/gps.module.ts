import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WialonModule } from '../wialon-auth/wialon.module';
import { GpsCommandService } from './application/services/gps-command.service';
import { GpsUnitResolverService } from './application/services/gps-unit-resolver.service';
import { NoReportService } from './application/services/no-report.service';
import { RecoveryService } from './application/services/recovery.service';
import { GpsController } from './infrastructure/controller/gps.controller';
import { RecoveryController } from './infrastructure/controller/recovery.controller';
import { GpsCommandAuditOrmEntity } from './infrastructure/entities/gps-command-audit.orm-entity';
import { NoReportSnapshotOrmEntity } from './infrastructure/entities/no-report-snapshot.orm-entity';

@Module({
  imports: [
    ConfigModule,
    WialonModule,
    TypeOrmModule.forFeature([
      GpsCommandAuditOrmEntity,
      NoReportSnapshotOrmEntity,
    ]),
  ],
  controllers: [GpsController, RecoveryController],
  providers: [
    GpsCommandService,
    GpsUnitResolverService,
    NoReportService,
    RecoveryService,
  ],
})
export class GpsModule {}
