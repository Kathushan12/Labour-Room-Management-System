import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { HandoverStatus } from '@lrms/shared';
import type { Shift } from './Shift.js';
import type { User } from './User.js';

@Entity('shift_handovers')
export class ShiftHandover {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'shift_id', type: 'uuid' })
  @Index('idx_shift_handovers_shift_id')
  shiftId!: string;

  @Column({ name: 'outgoing_user_id', type: 'uuid' })
  @Index('idx_shift_handovers_outgoing_user_id')
  outgoingUserId!: string;

  @Column({ name: 'incoming_user_id', type: 'uuid' })
  @Index('idx_shift_handovers_incoming_user_id')
  incomingUserId!: string;

  @Column({ name: 'handover_notes', type: 'text' })
  handoverNotes!: string;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 30,
    default: HandoverStatus.PENDING,
  })
  @Index('idx_shift_handovers_status')
  status!: HandoverStatus;

  @Column({ name: 'acknowledged_at', type: 'timestamptz', nullable: true })
  acknowledgedAt!: Date | null;

  @Column({ name: 'acknowledgement_notes', type: 'text', nullable: true })
  acknowledgementNotes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne('Shift', 'handovers', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'shift_id' })
  shift!: Shift;

  @ManyToOne('User', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'outgoing_user_id' })
  outgoingUser!: User;

  @ManyToOne('User', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'incoming_user_id' })
  incomingUser!: User;
}
