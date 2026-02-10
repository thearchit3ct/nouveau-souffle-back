import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import supertokens from 'supertokens-node';
import { errorHandler } from 'supertokens-node/framework/express';
import type { Response, Request } from 'express';

// Use supertokens.Error as the class reference for @Catch
const SuperTokensError = supertokens.Error;

@Catch(SuperTokensError)
export class SuperTokensExceptionFilter implements ExceptionFilter {
  private handler = errorHandler();

  catch(exception: InstanceType<typeof SuperTokensError>, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    if (res.headersSent) {
      return;
    }

    this.handler(exception, req, res, (err?: any) => {
      if (err) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: {
            code: 'AUTH_ERROR',
            message: 'Erreur d\'authentification',
            status: HttpStatus.INTERNAL_SERVER_ERROR,
          },
        });
      }
    });
  }
}
