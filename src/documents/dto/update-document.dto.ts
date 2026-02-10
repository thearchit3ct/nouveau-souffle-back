import { PartialType } from '@nestjs/swagger';
import { CreateDocumentDto } from './create-document.dto.js';

export class UpdateDocumentDto extends PartialType(CreateDocumentDto) {}
