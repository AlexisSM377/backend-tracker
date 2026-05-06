import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WialonModule } from '../wialon-auth/wialon.module';
import { AppointmentSlotService } from './application/services/appointment-slot.service';
import { GpsCommandService } from './application/services/gps-command.service';
import { GpsInstallationService } from './application/services/gps-installation.service';
import { GpsUnitResolverService } from './application/services/gps-unit-resolver.service';
import { InstallationAppointmentService } from './application/services/installation-appointment.service';
import { NoReportService } from './application/services/no-report.service';
import { RecoveryService } from './application/services/recovery.service';
import { GpsAppointmentSlotsController } from './infrastructure/controller/gps-appointment-slots.controller';
import { GpsInstallationAppointmentsController } from './infrastructure/controller/gps-installation-appointments.controller';
import { GpsInstallationsController } from './infrastructure/controller/gps-installations.controller';
import { GpsController } from './infrastructure/controller/gps.controller';
import { RecoveryController } from './infrastructure/controller/recovery.controller';
import { GpsAppointmentSlotOrmEntity } from './infrastructure/entities/gps-appointment-slot.orm-entity';
import { GpsCommandAuditOrmEntity } from './infrastructure/entities/gps-command-audit.orm-entity';
import { GpsInstallationAppointmentOrmEntity } from './infrastructure/entities/gps-installation-appointment.orm-entity';
import { GpsInstallationOrmEntity } from './infrastructure/entities/gps-installation.orm-entity';
import { NoReportSnapshotRunOrmEntity } from './infrastructure/entities/no-report-snapshot-run.orm-entity';
import { NoReportSnapshotOrmEntity } from './infrastructure/entities/no-report-snapshot.orm-entity';

@Module({
  imports: [
    ConfigModule,
    WialonModule,
    TypeOrmModule.forFeature([
      GpsAppointmentSlotOrmEntity,
      GpsCommandAuditOrmEntity,
      GpsInstallationAppointmentOrmEntity,
      GpsInstallationOrmEntity,
      NoReportSnapshotRunOrmEntity,
      NoReportSnapshotOrmEntity,
    ]),
  ],
  controllers: [
    GpsAppointmentSlotsController,
    GpsController,
    GpsInstallationAppointmentsController,
    GpsInstallationsController,
    RecoveryController,
  ],
  providers: [
    AppointmentSlotService,
    GpsCommandService,
    GpsInstallationService,
    GpsUnitResolverService,
    InstallationAppointmentService,
    NoReportService,
    RecoveryService,
  ],
})
export class GpsModule {}
