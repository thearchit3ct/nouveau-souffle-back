import {
  Module,
  MiddlewareConsumer,
  NestModule,
  DynamicModule,
} from '@nestjs/common';
import { AuthMiddleware } from './auth.middleware.js';
import { SuperTokensService } from './supertokens.service.js';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { RolesGuard } from './roles.guard.js';

@Module({})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes('*');
  }

  static forRoot(): DynamicModule {
    return {
      module: AuthModule,
      providers: [SuperTokensService, AuthGuard, RolesGuard],
      exports: [AuthGuard, RolesGuard],
      controllers: [AuthController],
    };
  }
}
