import { IsBoolean, IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator'

export const categories = ['films', 'music', 'books'] as const
export type LibraryCategory = (typeof categories)[number]

export const statusesByCategory: Record<LibraryCategory, readonly string[]> = {
  films: ['WATCHLIST', 'WATCHING', 'WATCHED'],
  music: ['WANT_TO_LISTEN', 'LISTENING', 'LISTENED', 'OWNED'],
  books: ['WANT_TO_READ', 'READING', 'READ', 'OWNED'],
}

export const allLibraryStatuses = [...new Set(Object.values(statusesByCategory).flat())]
export const ratingValues = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]

export class AddLibraryEntryDto {
  @IsIn(categories)
  category!: LibraryCategory

  @IsIn(['tmdb', 'musicbrainz', 'openlibrary'])
  provider!: string

  @IsString()
  @MaxLength(255)
  externalId!: string

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
