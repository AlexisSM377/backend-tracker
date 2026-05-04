import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WialonModule } from '../wialon-auth/wialon.module';
import { GpsCommandService } from './application/services/gps-command.service';
import { GpsInstallationService } from './application/services/gps-installation.service';
import { GpsUnitResolverService } from './application/services/gps-unit-resolver.service';
import { NoReportService } from './application/services/no-report.service';
import { RecoveryService } from './application/services/recovery.service';
import { GpsInstallationsController } from './infrastructure/controller/gps-installations.controller';
import { GpsController } from './infrastructure/controller/gps.controller';
import { RecoveryController } from './infrastructure/controller/recovery.controller';
import { GpsCommandAuditOrmEntity } from './infrastructure/entities/gps-command-audit.orm-entity';
import { GpsInstallationOrmEntity } from './infrastructure/entities/gps-installation.orm-entity';
import { NoReportSnapshotOrmEntity } from './infrastructure/entities/no-report-snapshot.orm-entity';

@Module({
  imports: [
    ConfigModule,
    WialonModule,
    TypeOrmModule.forFeature([
      GpsCommandAuditOrmEntity,
      GpsInstallationOrmEntity,
      NoReportSnapshotOrmEntity,
    ]),
  ],
  controllers: [GpsController, GpsInstallationsController, RecoveryController],
  providers: [
    GpsCommandService,
    GpsInstallationService,
    GpsUnitResolverService,
    NoReportService,
    RecoveryService,
  ],
})
export class GpsModule {}
