import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { SearchService } from './search.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';

@ApiTags('search')
@Controller('api/v1/search')
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Search across articles, projects and events (public)' })
  @ApiQuery({ name: 'q', required: true, type: String, description: 'Search query' })
  @ApiQuery({
    name: 'type',
    required: false,
    type: String,
    description: 'Comma-separated index names: articles,projects,events',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max results per index (default 10)' })
  @ApiResponse({ status: 200, description: 'Search results grouped by index' })
  async search(
    @Query('q') q: string,
    @Query('type') type?: string,
    @Query('limit') limit?: string,
  ) {
    const indexes = type ? type.split(',').map((t) => t.trim()).filter(Boolean) : undefined;
    const parsedLimit = limit ? Math.min(100, Math.max(1, parseInt(limit, 10))) : undefined;

    const results = await this.searchService.search(q || '', {
      indexes,
      limit: parsedLimit,
    });

    return { data: results };
  }

  @Post('reindex')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Trigger full reindexation of all searchable content (admin)' })
  @ApiResponse({ status: 201, description: 'Reindexation started' })
  async reindex() {
    // Fire the reindex in background -- do not await completion for fast HTTP response
    this.searchService.reindexAll(this.prisma).catch((err) => {
      // Already logged inside reindexAll, but catch the promise to avoid unhandled rejection
    });

    return { data: { message: 'Reindexation lancee' } };
  }
}
