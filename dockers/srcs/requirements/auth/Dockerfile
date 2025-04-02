FROM debian:bullseye

RUN apt update -y && apt upgrade -y && apt install -y \
    npm && \
    mkdir /usr/bin/auth /usr/bin/auth/dist && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY ./conf/package.json /usr/bin/auth/package.json
COPY ./conf/tsconfig.json /usr/bin/auth/tsconfig.json
COPY ./srcs /usr/bin/auth/srcs

COPY ./script/script.sh /usr/bin/script.sh

RUN chmod +x /usr/bin/script.sh
RUN chmod -R +x /usr/bin/auth

WORKDIR /usr/bin/auth

ENTRYPOINT ["bash", "/usr/bin/script.sh"]

CMD ["npm", "run", "start"]