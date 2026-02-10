import { Injectable, NestMiddleware } from '@nestjs/common';
import { middleware } from 'supertokens-node/framework/express';
import type { Request, Response, NextFunction } from 'express';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  private supertokensMiddleware = middleware();

  use(req: Request, res: Response, next: NextFunction) {
    this.supertokensMiddleware(req, res, next);
  }
}
