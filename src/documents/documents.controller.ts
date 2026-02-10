import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { verifySession } from 'supertokens-node/recipe/session/framework/express';
import { DocumentsService } from './documents.service.js';
import { CreateDocumentDto } from './dto/create-document.dto.js';
import { UpdateDocumentDto } from './dto/update-document.dto.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { CurrentUserPayload } from '../auth/current-user.decorator.js';

// Visibility levels ordered by access restriction
const VISIBILITY_BY_ROLE: Record<string, string[]> = {
  SUPER_ADMIN: ['PUBLIC', 'MEMBERS', 'ADMIN'],
  ADMIN: ['PUBLIC', 'MEMBERS', 'ADMIN'],
  COORDINATOR: ['PUBLIC', 'MEMBERS'],
  MEMBER: ['PUBLIC', 'MEMBERS'],
  VOLUNTEER: ['PUBLIC', 'MEMBERS'],
  DONOR: ['PUBLIC'],
};

/**
 * Extracts user role from an optional SuperTokens session on the request.
 * Returns undefined when no valid session exists.
 */
async function extractOptionalRole(req: Request, res: Response): Promise<string | undefined> {
  try {
    await new Promise<void>((resolve, reject) => {
      verifySession({ sessionRequired: false })(req as any, res as any, (err?: any) => {
        if (err) reject(err);
        else resolve();
      });
    });
  } catch {
    /* no session */
  }
  const session = (req as any).session;
  return session?.getAccessTokenPayload?.()?.role;
}

/**
 * Checks whether the given role can access a document with the specified visibility.
 * Throws ForbiddenException when the caller lacks permission.
 */
function assertVisibilityAccess(visibility: string, role?: string): void {
  const allowed = role
    ? VISIBILITY_BY_ROLE[role] ?? ['PUBLIC']
    : ['PUBLIC'];

  if (!allowed.includes(visibility)) {
    throw new ForbiddenException('Acces refuse a ce document');
  }
}

@ApiTags('documents')
@Controller('api/v1/documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'List documents (public with optional auth)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated documents' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Req() req?: Request,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const role = await extractOptionalRole(req!, res!);
    const pageNum = Math.max(1, parseInt(page || '1', 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit || '25', 10)));
    return this.documentsService.findAll(pageNum, limitNum, role, category, search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document by ID' })
  @ApiResponse({ status: 200, description: 'Document details' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async findOne(
    @Param('id') id: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const role = await extractOptionalRole(req, res);
    const result = await this.documentsService.findOne(id);
    assertVisibilityAccess(result.data.visibility, role);
    return result;
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Get document download URL' })
  @ApiResponse({ status: 200, description: 'Presigned download URL' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async download(
    @Param('id') id: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const role = await extractOptionalRole(req, res);
    const doc = await this.documentsService.findOne(id);
    assertVisibilityAccess(doc.data.visibility, role);

    // Fire-and-forget download count increment
    this.documentsService.incrementDownloadCount(id).catch(() => {});

    return this.documentsService.getDownloadUrl(id);
  }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload a document (admin)' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Document created' })
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateDocumentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.documentsService.create(dto, file, user.userId);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update document metadata (admin)' })
  @ApiResponse({ status: 200, description: 'Document updated' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateDocumentDto) {
    return this.documentsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete document (admin)' })
  @ApiResponse({ status: 200, description: 'Document deleted' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async remove(@Param('id') id: string) {
    return this.documentsService.remove(id);
  }
}
