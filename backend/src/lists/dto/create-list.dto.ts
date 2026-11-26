import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class CreateListDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title!: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null

  @IsOptional()
  @IsIn(['PRIVATE', 'PUBLIC'])
  visibility?: 'PRIVATE' | 'PUBLIC'
}
