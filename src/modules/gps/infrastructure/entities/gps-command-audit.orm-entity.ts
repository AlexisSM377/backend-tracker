import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('gps_command_audits')
export class GpsCommandAuditOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  command: string;

  @Column()
  serialNumber: string;

  @Column()
  executedBy: string;

  @Column({ type: 'int', nullable: true })
  wialonUnitId: number | null;

  @Column({ type: 'varchar', nullable: true })
  unitName: string | null;

  @Column({ default: true })
  success: boolean;

  @Column({ type: 'jsonb', nullable: true })
  wialonResponse: Record<string, unknown> | null;

  @Column({ type: 'varchar', nullable: true })
  errorCode: string | null;

  @Column({ type: 'varchar', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn()
  executedAt: Date;
}
