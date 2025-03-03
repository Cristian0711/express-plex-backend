FROM node:18-alpine

WORKDIR /app

# Instalăm dependințele necesare pentru compilare
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Run npm install
RUN npm install

# Bundle app source
COPY . .

EXPOSE 3000

ENV DOCKER=true

CMD ["npm", "start"]