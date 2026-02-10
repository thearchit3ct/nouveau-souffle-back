import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UploadService } from '../upload/upload.service.js';
import { CreateDocumentDto } from './dto/create-document.dto.js';
import { UpdateDocumentDto } from './dto/update-document.dto.js';

// Visibility levels ordered by access: PUBLIC < MEMBERS < ADMIN
const VISIBILITY_BY_ROLE: Record<string, string[]> = {
  SUPER_ADMIN: ['PUBLIC', 'MEMBERS', 'ADMIN'],
  ADMIN: ['PUBLIC', 'MEMBERS', 'ADMIN'],
  COORDINATOR: ['PUBLIC', 'MEMBERS'],
  MEMBER: ['PUBLIC', 'MEMBERS'],
  VOLUNTEER: ['PUBLIC', 'MEMBERS'],
  DONOR: ['PUBLIC'],
};

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  async findAll(
    page = 1,
    limit = 25,
    userRole?: string,
    category?: string,
    search?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    // Determine allowed visibility levels based on the caller's role
    const allowedVisibility = userRole
      ? VISIBILITY_BY_ROLE[userRole] ?? ['PUBLIC']
      : ['PUBLIC'];

    where.visibility = { in: allowedVisibility };

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          uploadedBy: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.document.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: {
        uploadedBy: { select: { firstName: true, lastName: true } },
      },
    });

    if (!document) {
      throw new NotFoundException('Document non trouve');
    }

    return { data: document };
  }

  async create(dto: CreateDocumentDto, file: Express.Multer.File, userId: string) {
    const uploaded = await this.uploadService.uploadFile(file, 'documents');

    const document = await this.prisma.document.create({
      data: {
        uploadedById: userId,
        title: dto.title,
        description: dto.description ?? null,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        filePath: uploaded.key,
        visibility: (dto.visibility as any) ?? 'MEMBERS',
        category: (dto.category as any) ?? 'OTHER',
        tags: dto.tags ?? [],
      },
      include: {
        uploadedBy: { select: { firstName: true, lastName: true } },
      },
    });

    return { data: document };
  }

  async update(id: string, dto: UpdateDocumentDto) {
    const existing = await this.prisma.document.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Document non trouve');
    }

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.visibility !== undefined) data.visibility = dto.visibility;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.tags !== undefined) data.tags = dto.tags;

    const updated = await this.prisma.document.update({
      where: { id },
      data,
      include: {
        uploadedBy: { select: { firstName: true, lastName: true } },
      },
    });

    return { data: updated };
  }

  async remove(id: string) {
    const existing = await this.prisma.document.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Document non trouve');
    }

    // Delete file from MinIO first, then remove the DB record
    await this.uploadService.deleteFile(existing.filePath);
    await this.prisma.document.delete({ where: { id } });

    return { data: { deleted: true } };
  }

  async incrementDownloadCount(id: string) {
    const existing = await this.prisma.document.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Document non trouve');
    }

    await this.prisma.document.update({
      where: { id },
      data: { downloadCount: { increment: 1 } },
    });
  }

  async getDownloadUrl(id: string) {
    const existing = await this.prisma.document.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Document non trouve');
    }

    const { url, expiresIn } = await this.uploadService.getDownloadUrl(existing.filePath);

    return {
      data: {
        url,
        expiresIn,
        fileName: existing.fileName,
        mimeType: existing.mimeType,
      },
    };
  }
}
