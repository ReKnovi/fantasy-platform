FROM node:24-slim AS deps
WORKDIR /app
RUN npm install -g npm@11.6.2
COPY package*.json ./
RUN npm ci

FROM deps AS build
WORKDIR /app
COPY tsconfig*.json ./
COPY src ./src
RUN npm run build

FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

RUN npm install -g npm@11.6.2
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/lib ./lib

EXPOSE 8080
CMD ["node", "lib/server.js"]
