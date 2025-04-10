FROM node:23-bookworm

WORKDIR /app

COPY ./src/ ./src/

COPY ./certs/ ./certs/

COPY ./conf/ .

RUN npm install && \
	mkdir dist/ && \
    mkdir uploads/ && \
    npm run build

ENTRYPOINT ["npm", "start"]