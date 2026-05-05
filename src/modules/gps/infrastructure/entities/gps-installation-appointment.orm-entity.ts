import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { GpsAppointmentSlotOrmEntity } from './gps-appointment-slot.orm-entity';

export enum GpsInstallationAppointmentStatus {
  Scheduled = 'scheduled',
  Cancelled = 'cancelled',
  Rescheduled = 'rescheduled',
  Completed = 'completed',
}

@Entity('gps_installation_appointments')
@Index('idx_gps_installation_appointments_vin', ['vin'])
@Index('idx_gps_installation_appointments_provider', ['provider'])
@Index('idx_gps_installation_appointments_status', ['status'])
@Index('idx_gps_installation_appointments_slot_id', ['slotId'])
export class GpsInstallationAppointmentOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  vin: string;

  @Column({ type: 'varchar' })
  provider: string;

  @Column({ type: 'uuid' })
  slotId: string;

  @ManyToOne(() => GpsAppointmentSlotOrmEntity, (slot) => slot.appointments)
  @JoinColumn({ name: 'slotId' })
  slot: GpsAppointmentSlotOrmEntity;

  @Column({
    type: 'varchar',
    default: GpsInstallationAppointmentStatus.Scheduled,
  })
  status: GpsInstallationAppointmentStatus;

  @Column({ type: 'varchar' })
  customerName: string;

  @Column({ type: 'varchar' })
  customerPhone: string;

  @Column({ type: 'varchar', nullable: true })
  customerEmail: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'varchar', nullable: true })
  serialNumber: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  rescheduledAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  installationId: string | null;

  @Column({ type: 'varchar', nullable: true })
  createdBy: string | null;

  @Column({ type: 'varchar', nullable: true })
  updatedBy: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
