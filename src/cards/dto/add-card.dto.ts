import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddCardDto {
  @ApiProperty({ example: '4111111111111111', description: 'The 16-digit credit card number' })
  @IsNotEmpty()
  @IsString()
  @Length(13, 19)
  @Matches(/^[0-9]+$/, { message: 'Card number must contain only digits' })
  cardNumber: string;
}
