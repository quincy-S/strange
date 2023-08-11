FROM mcr.microsoft.com/playwright:v1.37.0-jammy

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci
COPY . .
CMD ["node","index.js"]