import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (response.headersSent) {
      return;
    }

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Erreur interne du serveur';
    let code = 'INTERNAL_ERROR';
    let details: any[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as any;
        message = resp.message || message;
        details = Array.isArray(resp.message) ? resp.message : undefined;
        if (details) {
          message = 'Les donnees fournies sont invalides';
          code = 'VALIDATION_ERROR';
        }
      }

      if (status === 401) code = 'UNAUTHORIZED';
      if (status === 403) code = 'FORBIDDEN';
      if (status === 404) code = 'NOT_FOUND';
      if (status === 409) code = 'CONFLICT';
      if (status === 422) code = 'VALIDATION_ERROR';
      if (status === 429) code = 'RATE_LIMIT_EXCEEDED';
    } else {
      this.logger.error('Unhandled exception', exception);
    }

    response.status(status).json({
      error: {
        code,
        message,
        status,
        details,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    });
  }
}
