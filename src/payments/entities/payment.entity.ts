import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum PaymentState {
  INITIATED = 'INITIATED',
  PROCESSING = 'PROCESSING',
  AUTHORIZED = 'AUTHORIZED',
  CAPTURED = 'CAPTURED',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('uuid')
  cardToken: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ unique: true, nullable: true })
  idempotencyKey?: string;

  @Column({ nullable: true })
  durationMs?: number;

  @Column({
    type: 'enum',
    enum: PaymentState,
    default: PaymentState.INITIATED,
  })
  status: PaymentState;

  @Column({ nullable: true })
  authorizationCode?: string;

  @Column({ nullable: true })
  errorCode?: string;

  @Column({ nullable: true })
  errorMessage?: string;

  @Column('jsonb', { default: [] })
  history: Array<{ state: PaymentState; timestamp: Date; note?: string }>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
