FROM debian:bookworm

RUN apt update -y && apt upgrade -y && apt install -y \
    npm \
    openssl && \
    mkdir /usr/bin/api_gateway \
    /usr/bin/api_gateway/https /usr/bin/api_gateway/dist && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY ./conf/package.json /usr/bin/api_gateway/package.json
COPY ./conf/tsconfig.json /usr/bin/api_gateway/tsconfig.json
COPY ./srcs /usr/bin/api_gateway/srcs

COPY ./script/script.sh /usr/bin/script.sh

RUN chmod +x /usr/bin/script.sh
RUN chmod -R +x /usr/bin/api_gateway

WORKDIR /usr/bin/api_gateway

ENTRYPOINT ["bash", "/usr/bin/script.sh"]

CMD ["npm", "run", "start"]