import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('gps_no_report_snapshots')
export class NoReportSnapshotOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'int' })
  wialonUnitId: number;

  @Column()
  unitName: string;

  @Column({ type: 'varchar', nullable: true })
  serialNumber: string | null;

  @Column({ type: 'timestamp', nullable: true })
  lastReportAt: Date | null;

  @Column({ type: 'int' })
  minutesWithoutReport: number;

  @Column({ type: 'jsonb', nullable: true })
  lastKnownLocation: {
    lat: number;
    lon: number;
    speed: number;
  } | null;

  @Index()
  @Column({ type: 'timestamp' })
  generatedAt: Date;
}
