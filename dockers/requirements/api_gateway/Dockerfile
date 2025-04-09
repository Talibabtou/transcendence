FROM node:16

EXPOSE 8080

WORKDIR /

COPY ./app .

WORKDIR /app/

COPY ./conf/* .

ENTRYPOINT ["bash", "/usr/bin/script.sh"]

CMD ["npm", "run", "start"]