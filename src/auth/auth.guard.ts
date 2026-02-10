import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { verifySession } from 'supertokens-node/recipe/session/framework/express';
import type { Request, Response } from 'express';
import supertokens from 'supertokens-node';

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    try {
      await new Promise<void>((resolve, reject) => {
        verifySession()(req as any, res as any, (err?: any) => {
          if (err) reject(err);
          else resolve();
        });
      });
      return true;
    } catch (err) {
      if (supertokens.Error.isErrorFromSuperTokens(err)) {
        throw new UnauthorizedException('Session invalide ou expiree');
      }
      throw err;
    }
  }
}
