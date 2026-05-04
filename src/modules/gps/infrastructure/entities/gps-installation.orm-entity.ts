import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum GpsInstallationStatus {
  Active = 'active',
  Replaced = 'replaced',
}

@Entity('gps_installations')
@Index('idx_gps_installations_vin', ['vin'])
@Index('idx_gps_installations_serial_number', ['serialNumber'])
@Index('idx_gps_installations_provider', ['provider'])
@Index('idx_gps_installations_status', ['status'])
@Index('idx_gps_installations_active_vin', ['vin'], {
  unique: true,
  where: `"status" = 'active'`,
})
export class GpsInstallationOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  vin: string;

  @Column({ type: 'varchar' })
  serialNumber: string;

  @Column({ type: 'varchar' })
  provider: string;

  @Column({ type: 'varchar', default: GpsInstallationStatus.Active })
  status: GpsInstallationStatus;

  @Column({ type: 'int' })
  wialonUnitId: number;

  @Column({ type: 'varchar' })
  wialonUnitName: string;

  @Column({ type: 'timestamptz' })
  installedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  replacedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
