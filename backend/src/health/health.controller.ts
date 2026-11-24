import { Controller, Get } from '@nestjs/common'
import { HealthService } from './health.service.js'

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getApiHealth() {
    return { status: 'ok', service: 'libraria-api' }
  }

  @Get('database')
  getDatabaseHealth() {
    return this.healthService.getDatabaseHealth()
  }
}
