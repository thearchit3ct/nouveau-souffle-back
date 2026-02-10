import { Module } from '@nestjs/common';
import { ArticlesService } from './articles.service.js';
import { ArticlesController } from './articles.controller.js';
import { SearchModule } from '../search/search.module.js';

@Module({
  imports: [SearchModule],
  controllers: [ArticlesController],
  providers: [ArticlesService],
  exports: [ArticlesService],
})
export class ArticlesModule {}
