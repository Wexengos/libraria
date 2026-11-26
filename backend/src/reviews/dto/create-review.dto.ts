import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'
import { categories, type LibraryCategory } from '../../library/dto/add-library-entry.dto.js'

export class CreateReviewDto {
  @IsIn(categories)
  category!: LibraryCategory

  @IsString()
  @MaxLength(255)
  externalId!: string

  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string | null

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content!: string
}
