import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module.js'
import { MediaModule } from '../media/media.module.js'
import { UsersModule } from '../users/users.module.js'
import { MediaReviewsController, ReviewsController } from './reviews.controller.js'
import { ReviewsService } from './reviews.service.js'

@Module({ imports: [AuthModule, MediaModule, UsersModule], controllers: [MediaReviewsController, ReviewsController], providers: [ReviewsService] })
export class ReviewsModule {}
