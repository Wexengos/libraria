import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class UpdateReviewDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string | null

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content?: string
}
