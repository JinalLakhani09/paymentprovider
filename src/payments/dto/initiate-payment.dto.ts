import { IsNotEmpty, IsNumber, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InitiatePaymentDto {
  @ApiProperty({ example: 'b1e0f055-6b5d-4f11-9a3d-c12e847c234a', description: 'The secure token of the saved card' })
  @IsUUID()
  @IsNotEmpty()
  cardToken: string;

  @ApiProperty({ example: 49.99, description: 'The payment amount in USD' })
  @IsNumber()
  @Min(0.50)
  amount: number;
}
