import { Controller, Post, Body, UseGuards, Request, Headers } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiOperation({ summary: 'Initiate a new payment' })
  @ApiHeader({ name: 'Idempotency-Key', description: 'Unique key to prevent duplicate payments', required: false })
  @ApiResponse({ status: 201, description: 'Payment successfully processed (or failed and tracked).' })
  @ApiResponse({ status: 400, description: 'Invalid card token or bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  createPayment(
    @Request() req: any, 
    @Body() dto: InitiatePaymentDto,
    @Headers('Idempotency-Key') idempotencyKey?: string
  ) {
    return this.paymentsService.processPayment(req.user.id, dto, idempotencyKey);
  }
}
