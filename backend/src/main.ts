import 'reflect-metadata'
import dotenv from 'dotenv'
import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module.js'

dotenv.config({ path: '../.env' })

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const allowedOrigins = (process.env.FRONTEND_URL ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())

  app.setGlobalPrefix('api')
  app.enableCors({ origin: allowedOrigins, credentials: true })
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))

  await app.listen(process.env.PORT ?? 3000)
}

void bootstrap()
