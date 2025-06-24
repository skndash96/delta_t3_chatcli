FROM node:24-alpine

WORKDIR /app

COPY ./src ./package.json ./pnpm-lock.yaml ./tsconfig.json ./

RUN ["npm", "install", "-g", "pnpm"]
RUN ["npm", "install", "--frozen-lockfile"]

CMD ["sh", "-c", "pnpm run build && pnpm run start"]