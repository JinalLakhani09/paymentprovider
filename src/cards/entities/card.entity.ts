import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('cards')
export class Card {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  // For PCI-DSS compliance, we NEVER store the raw card number. We store it encrypted.
  @Column()
  encryptedPan: string;

  // This is the secure token that the user will use for future payments.
  @Column('uuid', { unique: true })
  token: string;

  @Column()
  last4: string;

  @CreateDateColumn()
  createdAt: Date;
}
