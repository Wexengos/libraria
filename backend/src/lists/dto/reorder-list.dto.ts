import { ArrayMaxSize, ArrayUnique, IsArray, IsUUID } from 'class-validator'

export class ReorderListDto {
  @IsArray()
  @ArrayMaxSize(500)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  itemIds!: string[]
}
