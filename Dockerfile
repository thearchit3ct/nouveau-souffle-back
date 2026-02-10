FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN npm ci
RUN npx prisma generate
COPY . .
RUN npm run build
# Replace tsc-compiled generated files with original Prisma-generated .ts files
# (tsc preserves .ts imports but compiles to .js, causing module resolution failures)
RUN rm -rf dist/generated && cp -r generated dist/generated

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/package*.json ./
COPY --from=build /app/prisma ./prisma/
COPY --from=build /app/prisma.config.ts ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "--experimental-strip-types", "--experimental-transform-types", "--disable-warning=ExperimentalWarning", "dist/src/main.js"]
