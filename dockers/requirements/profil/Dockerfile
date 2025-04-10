FROM node:23-bookworm

EXPOSE 8081

WORKDIR /app

COPY ./src/ ./src/

COPY ./conf/ .

RUN npm install && \
	mkdir dist/ && \
    mkdir uploads/ && \
    npm run build

ENTRYPOINT ["npm", "start"]