import { IsIn, IsString, MaxLength } from 'class-validator'
import { categories, type LibraryCategory } from '../../library/dto/add-library-entry.dto.js'

export class AddListItemDto {
  @IsIn(categories)
  category!: LibraryCategory

  @IsString()
  @MaxLength(255)
  externalId!: string
}
