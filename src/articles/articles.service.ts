import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { SearchService } from '../search/search.service.js';
import { CreateArticleDto } from './dto/create-article.dto.js';
import { UpdateArticleDto } from './dto/update-article.dto.js';

@Injectable()
export class ArticlesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly searchService: SearchService,
  ) {}

  async findAllPublished(
    page = 1,
    limit = 25,
    categorySlug?: string,
    search?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: any = { status: 'PUBLISHED' as const };

    if (categorySlug) {
      where.categories = {
        some: { category: { slug: categorySlug } },
      };
    }

    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }

    const [data, totalCount] = await Promise.all([
      this.prisma.article.findMany({
        where,
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
        include: {
          author: { select: { firstName: true, lastName: true } },
          categories: {
            include: {
              category: { select: { id: true, name: true, slug: true, color: true } },
            },
          },
        },
      }),
      this.prisma.article.count({ where }),
    ]);

    return {
      data,
      meta: { total: totalCount, page, limit, totalPages: Math.ceil(totalCount / limit) },
    };
  }

  async findAllAdmin(page = 1, limit = 25, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (status) {
      where.status = status;
    }

    const [data, totalCount] = await Promise.all([
      this.prisma.article.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { firstName: true, lastName: true } },
          categories: {
            include: {
              category: { select: { id: true, name: true, slug: true, color: true } },
            },
          },
        },
      }),
      this.prisma.article.count({ where }),
    ]);

    return {
      data,
      meta: { total: totalCount, page, limit, totalPages: Math.ceil(totalCount / limit) },
    };
  }

  async findBySlug(slug: string) {
    const article = await this.prisma.article.findUnique({
      where: { slug },
      include: {
        author: { select: { firstName: true, lastName: true } },
        categories: {
          include: {
            category: { select: { id: true, name: true, slug: true, color: true } },
          },
        },
      },
    });

    if (!article || article.status !== 'PUBLISHED') {
      throw new NotFoundException('Article non trouve');
    }

    // Fire-and-forget view count increment
    this.prisma.article
      .update({ where: { id: article.id }, data: { viewCount: { increment: 1 } } })
      .catch(() => {});

    return { data: article };
  }

  async create(dto: CreateArticleDto, authorId: string) {
    const slug = this.generateSlug(dto.title);

    const article = await this.prisma.article.create({
      data: {
        authorId,
        title: dto.title,
        slug,
        content: dto.content,
        excerpt: dto.excerpt ?? null,
        featuredImageUrl: dto.featuredImageUrl ?? null,
        seoMetadata: dto.seoMetadata ?? {},
        commentsEnabled: dto.commentsEnabled ?? false,
        status: 'DRAFT',
        categories: dto.categoryIds?.length
          ? {
              create: dto.categoryIds.map((categoryId) => ({ categoryId })),
            }
          : undefined,
      },
      include: {
        categories: {
          include: {
            category: { select: { id: true, name: true, slug: true, color: true } },
          },
        },
      },
    });

    // Index in Meilisearch (fire-and-forget)
    const categoryIds = article.categories?.map((c: any) => c.category?.id).filter(Boolean) ?? [];
    this.searchService.indexDocument('articles', article.id, {
      title: article.title,
      excerpt: article.excerpt,
      content: article.content,
      status: article.status,
      categoryIds,
      publishedAt: article.publishedAt,
      viewCount: article.viewCount,
    });

    return { data: article };
  }

  async update(id: string, dto: UpdateArticleDto) {
    const existing = await this.prisma.article.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Article non trouve');

    const { categoryIds, ...rest } = dto;
    const data: any = { ...rest };
    if (dto.title) data.slug = this.generateSlug(dto.title);
    if (dto.seoMetadata !== undefined) data.seoMetadata = dto.seoMetadata;

    // Handle category reassignment inside a transaction if needed
    if (categoryIds !== undefined) {
      await this.prisma.$transaction(async (tx) => {
        await tx.articleCategory.deleteMany({ where: { articleId: id } });
        await tx.article.update({ where: { id }, data });
        if (categoryIds.length > 0) {
          await tx.articleCategory.createMany({
            data: categoryIds.map((categoryId) => ({ articleId: id, categoryId })),
          });
        }
      });
    } else {
      await this.prisma.article.update({ where: { id }, data });
    }

    const updated = await this.prisma.article.findUnique({
      where: { id },
      include: {
        categories: {
          include: {
            category: { select: { id: true, name: true, slug: true, color: true } },
          },
        },
      },
    });

    // Re-index updated article in Meilisearch
    if (updated) {
      const updatedCategoryIds = updated.categories?.map((c: any) => c.category?.id).filter(Boolean) ?? [];
      this.searchService.indexDocument('articles', updated.id, {
        title: updated.title,
        excerpt: updated.excerpt,
        content: updated.content,
        status: updated.status,
        categoryIds: updatedCategoryIds,
        publishedAt: updated.publishedAt,
        viewCount: updated.viewCount,
      });
    }

    return { data: updated };
  }

  async publish(id: string) {
    const existing = await this.prisma.article.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Article non trouve');

    const updated = await this.prisma.article.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });

    // Index with PUBLISHED status
    this.searchService.indexDocument('articles', updated.id, {
      title: updated.title,
      excerpt: updated.excerpt,
      content: updated.content,
      status: 'PUBLISHED',
      categoryIds: [],
      publishedAt: updated.publishedAt,
      viewCount: updated.viewCount,
    });

    return { data: updated };
  }

  async archive(id: string) {
    const existing = await this.prisma.article.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Article non trouve');

    const updated = await this.prisma.article.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    // Remove from search index when archived
    this.searchService.removeDocument('articles', id);

    return { data: updated };
  }

  async remove(id: string) {
    const existing = await this.prisma.article.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Article non trouve');

    await this.prisma.article.delete({ where: { id } });

    // Remove from search index
    this.searchService.removeDocument('articles', id);

    return { data: { deleted: true } };
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
