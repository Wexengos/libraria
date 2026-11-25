import { IsOptional, IsString, IsUrl, Length, Matches } from 'class-validator'

export class UpdateProfileDto {
  @IsString()
  @Length(3, 24)
  @Matches(/^[a-z0-9]+(?:[_-][a-z0-9]+)*$/, {
    message: 'username may contain lowercase letters, numbers, underscores, and hyphens',
  })
  username!: string

  @IsString()
  @Length(1, 80)
  displayName!: string

  @IsOptional()
  @IsString()
  @Length(0, 500)
  bio?: string | null

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @Length(1, 2048)
  avatarUrl?: string | null
}
