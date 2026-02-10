import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export class CurrentUserPayload {
  userId!: string;
  role!: string;
  supertokensId!: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserPayload => {
    const request = ctx.switchToHttp().getRequest();
    const session = request.session;
    const payload = session?.getAccessTokenPayload();
    return {
      userId: payload?.userId,
      role: payload?.role,
      supertokensId: payload?.sub ?? session?.getUserId(),
    };
  },
);
