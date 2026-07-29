# syntax=docker/dockerfile:1

# ---- build stage -------------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

# Install dependencies from the lockfile first so this layer stays cached across
# source-only changes. `npm ci` fails when package.json and package-lock.json
# disagree, which is what keeps image builds reproducible.
#
# --ignore-scripts is required here: the postinstall hook runs `chakra typegen`
# against ./src, which is not in the image yet at this layer. The build step
# below runs the same typegen explicitly, so nothing is lost.
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# `npm run build` regenerates the Chakra type map (chakra typegen) before
# running `vite build`, so the typegen output never has to be committed.
COPY . .
RUN npm run build

# ---- runtime stage -----------------------------------------------------------
FROM nginx:alpine AS runtime

# Baked-in defaults; override at run time with `-e` or an env_file.
ENV VOCONE_API_URL=https://api.vocdoni.io/v2 \
    VOCONE_REFRESH_MS=15000

COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf

# nginx:alpine runs every executable in /docker-entrypoint.d before starting the
# server, so the runtime config is rewritten on each container start.
COPY docker/entrypoint.sh /docker-entrypoint.d/99-runtime-config.sh
RUN chmod +x /docker-entrypoint.d/99-runtime-config.sh

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
