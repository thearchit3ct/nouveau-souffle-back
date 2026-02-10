import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service.js';
import { ProjectsController } from './projects.controller.js';
import { SearchModule } from '../search/search.module.js';

@Module({
  imports: [SearchModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
