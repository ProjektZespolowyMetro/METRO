# Frontend w trybie deweloperskim (CRA dev server z hot-reloadem).
# Do produkcji używaj obrazu nginx (./nginx/Dockerfile), który robi build i serwuje statyki.
#
# Build:  docker build -t metro-frontend ./frontend
# Run:    docker run --rm -p 3000:3000 -v "$PWD/frontend/src:/app/src" metro-frontend

FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV HOST=0.0.0.0 \
    PORT=3000 \
    CHOKIDAR_USEPOLLING=true \
    WATCHPACK_POLLING=true

EXPOSE 3000

CMD ["npm", "start"]
