import { IsBoolean, IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator'
import { allLibraryStatuses, ratingValues } from './add-library-entry.dto.js'

export class UpdateLibraryEntryDto {
  @IsOptional()
  @IsString()
  @IsIn(allLibraryStatuses)
  status?: string

  @IsOptional()
  @IsIn(ratingValues)
  rating?: number | null

  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string | null

  @IsOptional()
  @IsDateString()
  startedAt?: string | null

  @IsOptional()
  @IsDateString()
  completedAt?: string | null
}
