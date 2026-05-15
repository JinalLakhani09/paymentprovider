import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentState } from '../payments/entities/payment.entity';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('metrics')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('metrics')
export class MetricsController {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get system metrics (Total txns, success rate, avg response time)' })
  async getMetrics() {
    const allPayments = await this.paymentsRepository.find();
    
    const totalTransactions = allPayments.length;
    
    if (totalTransactions === 0) {
      return { totalTransactions: 0, successRate: '0%', avgResponseTimeMs: 0 };
    }

    const successfulTransactions = allPayments.filter(p => p.status === PaymentState.CAPTURED).length;
    const successRate = (successfulTransactions / totalTransactions) * 100;

    const totalDuration = allPayments.reduce((sum, p) => sum + (p.durationMs || 0), 0);
    const avgResponseTimeMs = totalDuration / totalTransactions;

    return {
      totalTransactions,
      successRate: `${successRate.toFixed(2)}%`,
      avgResponseTimeMs: Math.round(avgResponseTimeMs),
    };
  }
}
