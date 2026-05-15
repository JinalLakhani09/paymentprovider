import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentState } from './entities/payment.entity';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { CardsService } from '../cards/cards.service';
import { BankService, BankResponse } from '../bank/bank.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  // Transient errors that we should retry
  private readonly RETRYABLE_ERRORS = [
    'NETWORK_TIMEOUT',
    'RATE_LIMIT_EXCEEDED',
  ];

  constructor(
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
    private cardsService: CardsService,
    private bankService: BankService,
  ) {}

  async processPayment(userId: string, dto: InitiatePaymentDto, idempotencyKey?: string) {
    // 0. Idempotency Check
    if (idempotencyKey) {
      const existing = await this.paymentsRepository.findOne({ where: { idempotencyKey } });
      if (existing) {
        this.logger.log(`Idempotency key ${idempotencyKey} hit. Returning existing payment.`);
        return existing;
      }
    }

    const startTime = Date.now();

    // 1. Create Payment in INITIATED state
    let payment = this.paymentsRepository.create({
      userId,
      cardToken: dto.cardToken,
      amount: dto.amount,
      idempotencyKey,
      status: PaymentState.INITIATED,
      history: [{ state: PaymentState.INITIATED, timestamp: new Date() }],
    });
    payment = await this.paymentsRepository.save(payment);

    // 2. Retrieve Decrypted PAN
    let decryptedPan: string;
    try {
      decryptedPan = await this.cardsService.getDecryptedPan(dto.cardToken, userId);
    } catch (error) {
      await this.updatePaymentState(payment, PaymentState.FAILED, { errorMessage: 'Invalid card token' });
      throw new BadRequestException('Invalid card token');
    }

    // 3. Move to PROCESSING
    payment = await this.updatePaymentState(payment, PaymentState.PROCESSING);

    // 4. Call Bank with Retry Mechanism
    const maxRetries = 3;
    let attempt = 0;
    let bankResult: BankResponse | null = null;

    while (attempt <= maxRetries) {
      if (attempt > 0) {
        // Log retry and apply exponential backoff with jitter
        this.logger.warn(`Retrying payment ${payment.id}. Attempt ${attempt} of ${maxRetries}`);
        payment = await this.updatePaymentState(payment, PaymentState.RETRYING, {
          note: `Retry attempt ${attempt}`,
        });
        const backoffMs = Math.pow(2, attempt) * 500 + Math.random() * 200; // e.g. 1000ms, 2000ms, 4000ms
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }

      bankResult = await this.bankService.processPayment(dto.amount, decryptedPan);

      if (bankResult.success) {
        break; // Success! Exit retry loop.
      } else if (bankResult.errorCode && !this.RETRYABLE_ERRORS.includes(bankResult.errorCode)) {
        break; // Permanent failure! Exit retry loop.
      }
      
      attempt++;
    }

    // 5. Finalize State
    if (bankResult?.success) {
      payment.authorizationCode = bankResult.authorizationCode;
      payment = await this.updatePaymentState(payment, PaymentState.AUTHORIZED);
      // Immediately Capture for this flow
      payment = await this.updatePaymentState(payment, PaymentState.CAPTURED);
    } else {
      payment.errorCode = bankResult?.errorCode;
      payment.errorMessage = bankResult?.errorMessage;
      payment = await this.updatePaymentState(payment, PaymentState.FAILED, {
        note: `Failed after ${attempt} attempts`,
      });
    }

    payment.durationMs = Date.now() - startTime;
    return this.paymentsRepository.save(payment);
  }

  private async updatePaymentState(
    payment: Payment,
    newState: PaymentState,
    additionalData?: Partial<Payment> & { note?: string },
  ): Promise<Payment> {
    payment.status = newState;
    payment.history.push({
      state: newState,
      timestamp: new Date(),
      note: additionalData?.note,
    });

    if (additionalData) {
      delete additionalData.note;
      Object.assign(payment, additionalData);
    }

    return this.paymentsRepository.save(payment);
  }
}
