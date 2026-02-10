import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/http-exception.filter.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';
import { SuperTokensExceptionFilter } from './auth/auth.filter.js';
import supertokens from 'supertokens-node';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // CORS - SuperTokens compatible
  app.enableCors({
    origin: [
      process.env.WEBSITE_URL || 'http://localhost:3000',
      'https://ns.thearchit3ct.xyz',
      'https://nouveau-souffle-front.vercel.app',
    ],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      ...supertokens.getAllCORSHeaders(),
    ],
    exposedHeaders: [
      ...supertokens.getAllCORSHeaders(),
      'front-token',
      'st-access-token',
      'st-refresh-token',
    ],
    credentials: true,
  });

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global filters
  app.useGlobalFilters(new SuperTokensExceptionFilter());
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global interceptors
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger/OpenAPI
  const config = new DocumentBuilder()
    .setTitle('Nouveau Souffle API')
    .setDescription(
      'API REST de la plateforme Nouveau Souffle en Mission',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('health', 'Health check endpoints')
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management')
    .addTag('memberships', 'Membership management')
    .addTag('donations', 'Donation management')
    .addTag('projects', 'Project management')
    .addTag('events', 'Event management')
    .addTag('notifications', 'Notification management')
    .addTag('articles', 'Article/blog management')
    .addTag('categories', 'Category management')
    .addTag('uploads', 'File upload management')
    .addTag('webhooks', 'Stripe webhook handlers')
    .addTag('receipts', 'Donation receipt management')
    .addTag('contact', 'Contact form')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`Nouveau Souffle API running on port ${port}`);
  console.log(`Swagger: http://localhost:${port}/api/docs`);
}
bootstrap();
