# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app

RUN corepack enable
RUN corepack prepare pnpm@9.15.9 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable
RUN corepack prepare pnpm@9.15.9 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src

RUN pnpm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN corepack enable
RUN corepack prepare pnpm@9.15.9 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /app/dist ./dist

USER node

EXPOSE 3000

CMD ["node", "dist/main"]
