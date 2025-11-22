# Stage 1: Install dependencies
FROM node:24-alpine3.22 AS deps

RUN npm i -g pnpm
WORKDIR /app

# Copy only package manager files for caching -> install dependencies
COPY package.json package-lock.json* ./
RUN pnpm i

FROM node:24-alpine3.22 AS build
# Stage 2: Build the project

RUN npm i -g pnpm
WORKDIR /app

# Copy dependencies from previous stage
COPY --from=deps /app/node_modules ./node_modules
# Copy the rest of the app
COPY . .

RUN pnpm run build

FROM node:24-alpine3.22 AS runner
# Stage 3: Final minimal image

RUN npm i -g pnpm
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./

EXPOSE 3000

# Will be executed from within the entrypoint script
CMD ["pnpm", "run", "start"]
