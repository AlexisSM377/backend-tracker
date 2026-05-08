import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum NoReportSnapshotRunStatus {
  Completed = 'completed',
  Failed = 'failed',
}

@Entity('gps_no_report_snapshot_runs')
export class NoReportSnapshotRunOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'timestamp' })
  generatedAt: Date;

  @Column({ type: 'varchar', default: NoReportSnapshotRunStatus.Completed })
  status: NoReportSnapshotRunStatus;

  @Column({ type: 'int', default: 60 })
  thresholdMinutes: number;

  @Column({ type: 'int', default: 0 })
  totalUnitsChecked: number;

  @Column({ type: 'int', default: 0 })
  totalUnitsWithoutReport: number;

  @Column({ type: 'varchar', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
