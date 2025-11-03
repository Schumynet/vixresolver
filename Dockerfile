FROM node:18-slim
WORKDIR /app
COPY package*.json ./
RUN npm install
RUN npx playwright install --with-deps
COPY . .
EXPOSE 3000
CMD ["node", "resolve_service.js"]
