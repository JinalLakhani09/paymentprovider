import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

export interface BankResponse {
  success: boolean;
  authorizationCode?: string;
  errorCode?: string;
  errorMessage?: string;
}

@Injectable()
export class BankService {
  private readonly logger = new Logger(BankService.name);

  async processPayment(amount: number, decryptedPan: string): Promise<BankResponse> {
    this.logger.log(`Initiating bank API request for amount: $${amount}`);
    
    // Simulate variable response times (100ms - 3000ms)
    const delay = Math.floor(Math.random() * 2900) + 100;
    await new Promise(resolve => setTimeout(resolve, delay));

    const roll = Math.random() * 100; // Generate a number between 0 and 100

    // Success rate: 85%
    if (roll < 85) {
      this.logger.log(`Bank API: Payment successful (Latency: ${delay}ms)`);
      return {
        success: true,
        authorizationCode: `AUTH_${uuidv4().replace(/-/g, '').substring(0, 10).toUpperCase()}`,
      };
    }

    // Insufficient funds (8%)
    if (roll < 93) {
      this.logger.warn(`Bank API: Insufficient funds (Latency: ${delay}ms)`);
      return { success: false, errorCode: 'INSUFFICIENT_FUNDS', errorMessage: 'Card has insufficient funds' };
    }

    // Invalid card (2%)
    if (roll < 95) {
      this.logger.warn(`Bank API: Invalid card (Latency: ${delay}ms)`);
      return { success: false, errorCode: 'INVALID_CARD', errorMessage: 'Invalid card details provided' };
    }

    // Card expired (2%)
    if (roll < 97) {
      this.logger.warn(`Bank API: Card expired (Latency: ${delay}ms)`);
      return { success: false, errorCode: 'CARD_EXPIRED', errorMessage: 'The card has expired' };
    }

    // Network timeout (2%)
    if (roll < 99) {
      this.logger.error(`Bank API: Network timeout (Latency: ${delay}ms)`);
      return { success: false, errorCode: 'NETWORK_TIMEOUT', errorMessage: 'Bank server did not respond in time' };
    }

    // Rate limit exceeded (1%)
    this.logger.error(`Bank API: Rate limit exceeded (Latency: ${delay}ms)`);
    return { success: false, errorCode: 'RATE_LIMIT_EXCEEDED', errorMessage: 'Too many requests to bank API' };
  }
}
