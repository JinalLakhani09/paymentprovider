import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Card } from './entities/card.entity';
import { AddCardDto } from './dto/add-card.dto';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

@Injectable()
export class CardsService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly secretKey = crypto.scryptSync(process.env.JWT_SECRET || 'fallback_secret', 'salt', 32);

  constructor(
    @InjectRepository(Card)
    private cardsRepository: Repository<Card>,
  ) {}

  async addCard(userId: string, addCardDto: AddCardDto) {
    if (!this.isValidLuhn(addCardDto.cardNumber)) {
      throw new BadRequestException('Invalid card number (Luhn check failed)');
    }

    const token = uuidv4();
    const last4 = addCardDto.cardNumber.slice(-4);
    const encryptedPan = this.encrypt(addCardDto.cardNumber);

    const card = this.cardsRepository.create({
      userId,
      token,
      encryptedPan,
      last4,
    });

    await this.cardsRepository.save(card);

    return { token, last4 };
  }

  async getDecryptedPan(token: string, userId: string): Promise<string> {
    const card = await this.cardsRepository.findOne({ where: { token, userId } });
    if (!card) {
      throw new BadRequestException('Invalid card token or card does not belong to user');
    }
    return this.decrypt(card.encryptedPan);
  }

  // --- Utility Methods ---

  private isValidLuhn(cardNumber: string): boolean {
    let sum = 0;
    let shouldDouble = false;
    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber.charAt(i), 10);

      if (shouldDouble) {
        if ((digit *= 2) > 9) digit -= 9;
      }
      sum += digit;
      shouldDouble = !shouldDouble;
    }
    return (sum % 10) === 0;
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.secretKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  // Used later in payments
  decrypt(encryptedData: string): string {
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedText = Buffer.from(parts[2], 'hex');

    const decipher = crypto.createDecipheriv(this.algorithm, this.secretKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
