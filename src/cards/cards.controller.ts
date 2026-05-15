import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { CardsService } from './cards.service';
import { AddCardDto } from './dto/add-card.dto';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('cards')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('cards')
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Post()
  @ApiOperation({ summary: 'Add a new payment card' })
  @ApiResponse({ status: 201, description: 'Card successfully added and tokenized.' })
  @ApiResponse({ status: 400, description: 'Invalid card number (Luhn check failed).' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  addCard(@Request() req: any, @Body() addCardDto: AddCardDto) {
    // req.user is populated by JwtStrategy
    return this.cardsService.addCard(req.user.id, addCardDto);
  }
}
