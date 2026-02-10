import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MeiliSearch } from 'meilisearch';

// Index configuration for each searchable entity
const INDEX_CONFIGS = {
  articles: {
    filterableAttributes: ['status', 'categoryIds'],
    searchableAttributes: ['title', 'excerpt', 'content'],
    sortableAttributes: ['publishedAt', 'viewCount'],
  },
  projects: {
    filterableAttributes: ['status'],
    searchableAttributes: ['name', 'description'],
    sortableAttributes: ['createdAt'],
  },
  events: {
    filterableAttributes: ['status', 'type', 'visibility'],
    searchableAttributes: ['title', 'description', 'locationName'],
    sortableAttributes: ['startDatetime'],
  },
} as const;

type IndexName = keyof typeof INDEX_CONFIGS;

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private client: MeiliSearch;
  private available = false;

  constructor(private readonly config: ConfigService) {
    this.client = new MeiliSearch({
      host: this.config.get<string>('MEILISEARCH_URL', 'http://ns-meilisearch:7700'),
      apiKey: this.config.get<string>('MEILISEARCH_MASTER_KEY', ''),
    });
  }

  async onModuleInit() {
    try {
      // Verify connectivity
      await this.client.health();
      this.available = true;
      this.logger.log('Meilisearch connection established');

      // Configure all indexes
      for (const [indexName, settings] of Object.entries(INDEX_CONFIGS)) {
        const index = this.client.index(indexName);
        await index.updateSettings({
          filterableAttributes: [...settings.filterableAttributes],
          searchableAttributes: [...settings.searchableAttributes],
          sortableAttributes: [...settings.sortableAttributes],
        });
        this.logger.log(`Index "${indexName}" configured`);
      }
    } catch (error) {
      // Meilisearch being unavailable should not crash the application
      this.logger.warn(
        `Meilisearch unavailable at startup: ${error instanceof Error ? error.message : String(error)}. Search features will be disabled.`,
      );
      this.available = false;
    }
  }

  /**
   * Add or update a document in the specified index.
   * Fire-and-forget: failures are logged but do not propagate.
   */
  async indexDocument(
    indexName: string,
    id: string,
    document: Record<string, unknown>,
  ): Promise<void> {
    if (!this.available) return;

    try {
      const index = this.client.index(indexName);
      await index.addDocuments([{ id, ...document }], { primaryKey: 'id' });
    } catch (error) {
      this.logger.error(
        `Failed to index document ${id} in "${indexName}": ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Remove a document from the specified index.
   */
  async removeDocument(indexName: string, id: string): Promise<void> {
    if (!this.available) return;

    try {
      const index = this.client.index(indexName);
      await index.deleteDocument(id);
    } catch (error) {
      this.logger.error(
        `Failed to remove document ${id} from "${indexName}": ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Multi-index search. Queries all specified indexes (or all if none provided)
   * and aggregates results.
   */
  async search(
    query: string,
    options?: { indexes?: string[]; limit?: number; filters?: string },
  ): Promise<{
    results: Array<{
      index: string;
      hits: Record<string, unknown>[];
      estimatedTotalHits: number;
    }>;
  }> {
    if (!this.available) {
      return { results: [] };
    }

    const targetIndexes = options?.indexes?.length
      ? options.indexes
      : Object.keys(INDEX_CONFIGS);

    const limit = options?.limit ?? 10;

    const searchPromises = targetIndexes.map(async (indexName) => {
      try {
        const result = await this.client.index(indexName).search(query, {
          limit,
          filter: options?.filters,
        });
        return {
          index: indexName,
          hits: result.hits as Record<string, unknown>[],
          estimatedTotalHits: result.estimatedTotalHits ?? 0,
        };
      } catch (error) {
        this.logger.error(
          `Search failed on index "${indexName}": ${error instanceof Error ? error.message : String(error)}`,
        );
        return { index: indexName, hits: [], estimatedTotalHits: 0 };
      }
    });

    const results = await Promise.all(searchPromises);
    return { results };
  }

  /**
   * Full reindex of all searchable entities from the database.
   * Accepts the PrismaService instance to query data.
   * Uses `any` to avoid coupling with Prisma's complex generated types.
   */
  async reindexAll(prisma: any): Promise<void> {
    if (!this.available) {
      this.logger.warn('Meilisearch unavailable, cannot reindex');
      return;
    }

    // Reindex published articles
    try {
      const articles = (await prisma.article.findMany({
        where: { status: 'PUBLISHED' },
        include: {
          categories: {
            include: { category: { select: { id: true } } },
          },
        },
      })) as Array<Record<string, unknown> & { categories?: Array<{ category: { id: string } }> }>;

      const articleDocs = articles.map((a) => ({
        id: a.id as string,
        title: a.title,
        excerpt: a.excerpt,
        content: a.content,
        status: a.status,
        categoryIds: a.categories?.map((c) => c.category.id) ?? [],
        publishedAt: a.publishedAt,
        viewCount: a.viewCount,
      }));

      if (articleDocs.length > 0) {
        await this.client.index('articles').addDocuments(articleDocs, { primaryKey: 'id' });
      }
      this.logger.log(`Reindexed ${articleDocs.length} articles`);
    } catch (error) {
      this.logger.error(`Reindex articles failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Reindex active/completed projects
    try {
      const projects = (await prisma.project.findMany({
        where: { status: { in: ['ACTIVE', 'COMPLETED'] } },
      })) as Array<Record<string, unknown>>;

      const projectDocs = projects.map((p) => ({
        id: p.id as string,
        name: p.name,
        description: p.description,
        status: p.status,
        slug: p.slug,
        imageUrl: p.imageUrl,
        createdAt: p.createdAt,
      }));

      if (projectDocs.length > 0) {
        await this.client.index('projects').addDocuments(projectDocs, { primaryKey: 'id' });
      }
      this.logger.log(`Reindexed ${projectDocs.length} projects`);
    } catch (error) {
      this.logger.error(`Reindex projects failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Reindex published/ongoing events
    try {
      const events = (await prisma.event.findMany({
        where: { status: { in: ['PUBLISHED', 'ONGOING'] } },
      })) as Array<Record<string, unknown>>;

      const eventDocs = events.map((e) => ({
        id: e.id as string,
        title: e.title,
        description: e.description,
        status: e.status,
        type: e.type,
        visibility: e.visibility,
        locationName: e.locationName,
        startDatetime: e.startDatetime,
        slug: e.slug,
      }));

      if (eventDocs.length > 0) {
        await this.client.index('events').addDocuments(eventDocs, { primaryKey: 'id' });
      }
      this.logger.log(`Reindexed ${eventDocs.length} events`);
    } catch (error) {
      this.logger.error(`Reindex events failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
