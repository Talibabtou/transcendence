FROM node:23-bookworm

EXPOSE 8082

WORKDIR /app

COPY ./src/ ./src/

COPY ./conf/ .

RUN npm install && \
	mkdir dist/ && \
    mkdir db/ && \
    npm run build

ENTRYPOINT ["npm", "start"]