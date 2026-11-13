import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { Bed } from './Bed.js';
import type { Admission } from './Admission.js';
import type { User } from './User.js';

@Entity('bed_allocation_history')
export class BedAllocationHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'bed_id', type: 'uuid' })
  @Index('idx_bed_allocation_bed_id')
  bedId!: string;

  @Column({ name: 'admission_id', type: 'uuid' })
  @Index('idx_bed_allocation_admission_id')
  admissionId!: string;

  @Column({ name: 'assigned_by_user_id', type: 'uuid' })
  assignedByUserId!: string;

  @Column({ name: 'assigned_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  assignedAt!: Date;

  @Column({ name: 'released_by_user_id', type: 'uuid', nullable: true })
  releasedByUserId!: string | null;

  @Column({ name: 'released_at', type: 'timestamptz', nullable: true })
  @Index('idx_bed_allocation_released_at')
  releasedAt!: Date | null;

  @Column({ name: 'release_reason', type: 'varchar', length: 255, nullable: true })
  releaseReason!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne('Bed', 'allocationHistory')
  @JoinColumn({ name: 'bed_id' })
  bed!: Bed;

  @ManyToOne('Admission', 'bedHistory')
  @JoinColumn({ name: 'admission_id' })
  admission!: Admission;

  @ManyToOne('User')
  @JoinColumn({ name: 'assigned_by_user_id' })
  assignedByUser!: User;

  @ManyToOne('User', { nullable: true })
  @JoinColumn({ name: 'released_by_user_id' })
  releasedByUser!: User | null;
}
