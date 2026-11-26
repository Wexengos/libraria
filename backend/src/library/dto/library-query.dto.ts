import { IsIn, IsOptional } from 'class-validator'
import { allLibraryStatuses, categories, type LibraryCategory } from './add-library-entry.dto.js'

export class LibraryQueryDto {
  @IsOptional()
  @IsIn(categories)
  category?: LibraryCategory

  @IsOptional()
  @IsIn(allLibraryStatuses)
  status?: string

  @IsOptional()
  @IsIn(['true', 'false'])
  favorite?: string

  @IsOptional()
  @IsIn(['addedAt', 'title', 'releaseYear', 'rating'])
  sort?: 'addedAt' | 'title' | 'releaseYear' | 'rating'

  @IsOptional()
  @IsIn(['asc', 'desc'])
  direction?: 'asc' | 'desc'
}
