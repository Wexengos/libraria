import { Controller, Get, Param, Query, Res } from '@nestjs/common'
import { MediaProvidersService } from './media-providers.service.js'

interface ImageResponse {
  setHeader(name: string, value: string): void
  send(body: Buffer): void
}

@Controller()
export class MediaController {
  constructor(private readonly media: MediaProvidersService) {}

  @Get('films/search')
  searchFilms(@Query('q') query = '') {
    return this.media.search('film', query)
  }

  @Get('films/:externalId')
  getFilm(@Param('externalId') externalId: string) {
    return this.media.get('film', externalId)
  }

  @Get('music/search')
  searchMusic(@Query('q') query = '') {
    return this.media.search('music', query)
  }

  @Get('music/:externalId')
  getMusic(@Param('externalId') externalId: string) {
    return this.media.get('music', externalId)
  }

  @Get('books/search')
  searchBooks(@Query('q') query = '') {
    return this.media.search('book', query)
  }

  @Get('books/:externalId')
  getBook(@Param('externalId') externalId: string) {
    return this.media.get('book', externalId)
  }

  @Get('images/:provider/:id')
  async image(@Param('provider') provider: string, @Param('id') id: string, @Res() response: ImageResponse) {
    const result = await this.media.image(provider, id)
    response.setHeader('Content-Type', result.contentType)
    response.setHeader('Cache-Control', 'public, max-age=86400')
    response.send(Buffer.from(result.body))
  }
}
