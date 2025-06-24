FROM node:24-alpine

WORKDIR /app

COPY ./src ./package.json ./src/pnpm-lock.yaml ./tsconfig.json ./

RUN ["pnpm", "install", "--frozen-lockfile"]

CMD []