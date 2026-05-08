import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { GpsInstallationAppointmentOrmEntity } from './gps-installation-appointment.orm-entity';

@Entity('gps_appointment_slots')
@Index('idx_gps_appointment_slots_provider', ['provider'])
@Index('idx_gps_appointment_slots_starts_at', ['startsAt'])
@Index('idx_gps_appointment_slots_is_active', ['isActive'])
export class GpsAppointmentSlotOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  provider: string;

  @Column({ type: 'timestamptz' })
  startsAt: Date;

  @Column({ type: 'timestamptz' })
  endsAt: Date;

  @Column({ type: 'varchar' })
  location: string;

  @Column({ type: 'int', default: 1 })
  capacity: number;

  @Column({ type: 'int', default: 0 })
  reservedCount: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(
    () => GpsInstallationAppointmentOrmEntity,
    (appointment) => appointment.slot,
  )
  appointments: GpsInstallationAppointmentOrmEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
