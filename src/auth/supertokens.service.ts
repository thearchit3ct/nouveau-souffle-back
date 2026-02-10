import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import supertokens from 'supertokens-node';
import EmailPassword from 'supertokens-node/recipe/emailpassword';
import Session from 'supertokens-node/recipe/session';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class SuperTokensService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    supertokens.init({
      framework: 'express',
      supertokens: {
        connectionURI:
          this.config.get<string>('SUPERTOKENS_CONNECTION_URI') ||
          'http://localhost:3567',
        apiKey: this.config.get<string>('SUPERTOKENS_API_KEY'),
      },
      appInfo: {
        appName: 'Nouveau Souffle',
        apiDomain:
          this.config.get<string>('API_URL') || 'http://localhost:3001',
        websiteDomain:
          this.config.get<string>('WEBSITE_URL') || 'http://localhost:3000',
        apiBasePath: '/api/auth',
        websiteBasePath: '/auth',
      },
      recipeList: [
        EmailPassword.init({
          signUpFeature: {
            formFields: [
              { id: 'firstName' },
              { id: 'lastName' },
            ],
          },
          override: {
            apis: (originalImplementation) => ({
              ...originalImplementation,
              signUpPOST: async (input) => {
                if (!originalImplementation.signUpPOST) {
                  throw new Error('signUpPOST not available');
                }
                const response =
                  await originalImplementation.signUpPOST(input);
                if (response.status === 'OK') {
                  const formFields = input.formFields;
                  const firstName =
                    String(formFields.find((f) => f.id === 'firstName')?.value ?? '');
                  const lastName =
                    String(formFields.find((f) => f.id === 'lastName')?.value ?? '');
                  const email =
                    String(formFields.find((f) => f.id === 'email')?.value ?? '');

                  await this.prisma.user.create({
                    data: {
                      email,
                      supertokensId: response.user.id,
                      firstName,
                      lastName,
                      status: 'PENDING',
                      role: 'DONOR',
                      emailVerified: false,
                    },
                  });
                }
                return response;
              },
            }),
          },
        }),
        Session.init({
          override: {
            functions: (originalImplementation) => ({
              ...originalImplementation,
              createNewSession: async (input) => {
                const user = await this.prisma.user.findUnique({
                  where: { supertokensId: input.userId },
                });

                input.accessTokenPayload = {
                  ...input.accessTokenPayload,
                  role: user?.role || 'DONOR',
                  userId: user?.id,
                };

                return originalImplementation.createNewSession(input);
              },
            }),
          },
        }),
      ],
    });
  }
}
