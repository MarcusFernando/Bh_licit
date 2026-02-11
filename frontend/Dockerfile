# Atualizamos para a versão 22 (Requisito do Next.js 14/15)
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]