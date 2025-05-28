# transcendance (Back)
## Features
- Prettier (configurer pour formater les fichiers du projet rapidement et de la même manière pour rentre le code simple à lire, avec un fichier de configuration par service).
- ESLint (avec la configuration recommandé pour afficher les fautes de syntaxes sur l'IDE, avec un fichier de configuration par service).
- Typescript (plus sécure avec le typage).
- Gateway (Permet de rediriger vers le bon microservice service et de centraliser les vérifications pour alléger les services).
- Securites (voir fichier SECURITY_CHECK.md)
- Swagger (Permet d'avoir une interface avec les routes disponible sur l'API, le type de réponse attendu et le type de retour renvoyé pour chaque route).
## Install
### Necessary tools
```bash
sudo apt-get install npm openssl
```
### Generate certif https self signed
```bash
openssl genrsa -out key.pem
openssl req -new -key key.pem -out csr.pem
openssl x509 -req -days 9999 -in csr.pem -signkey key.pem -out cert.pem
rm csr.pem
```
### Typescript env
```bash
npm init -y // generate .json files

// GLOBAL (dev)
npm i --save-dev @types/node @eslint/js eslint eslint-config-prettier globals prettier typescript-eslint eslint-plugin-prettier

// GATEWAY
npm install typescript fastify @types/node-fetch@2 @fastify/jwt @fastify/static @fastify/multipart @fastify/rate-limit @fastify/swagger-ui @fastify/swagger @fastify/helmet @fastify/cors

// AUTH
npm install typescript fastify sqlite3 sqlite @fastify/jwt uuid speakeasy @types/speakeasy qrcode @types/qrcode

// PROFIL
npm install typescript fastify @fastify/jwt @fastify/static @fastify/multipart

// FRIENDS
npm install typescript fastify sqlite3 sqlite @fastify/jwt 

npx tsc --init // generate tsconfig file
```
- configure tsconfig.json
```bash
npx tsc // compile .ts to .js
```
### Docker-compose
```bash
services:
  api:
    build: ./requirements/api
    container_name: api
    environment:
      - API_ADDR="0.0.0.0"
      - API_PORT="8080"
      - PROFIL_PORT="8081"
      - AUTH_PORT="8082"
      - FRIENDS_PORT="8084"
      - UPLOADS_DIR="./uploads"
    env_file:
      - .env
    ports:
      - 8080:8080
    networks:
      - transcendance-net
    volumes:
      - uploads-volume:/app/uploads
    restart: always
  profil:
    build: ./requirements/profil
    container_name: profil
    environment:
      - PROFIL_ADDR="profil"
      - PROFIL_PORT="8081"
    env_file:
      - .env
    expose:
      - 8081
    networks:
      - transcendance-net
    volumes:
      - uploads-volume:/app/uploads
    restart: always
  auth:
    build: ./requirements/auth
    container_name: auth
    environment:
      - AUTH_ADDR="auth"
      - AUTH_PORT="8082"
    env_file:
      - .env
    expose:
      - 8082
    networks:
      - transcendance-net
    volumes:
      - dev-volume:/app/db
    restart: always
  # game:
  #   build: ./requirements/game
  #   container_name: game
  #   expose:
  #     - 8083
  #   networks:
  #     - transcendance-net
  #   restart: always
  friends:
    build: ./requirements/friends
    container_name: friends
    environment:
      - FRIENDS_ADDR="friends"
      - FRIENDS_PORT="8084"
    env_file:
      - .env
    expose:
      - 8084
    networks:
      - transcendance-net
    volumes:
      - dev-volume:/app/db
    restart: always

networks:
  transcendance-net:
    driver: bridge

volumes:
  uploads-volume: 
  dev-volume:
    driver: local
    driver_opts:
      o: bind
      type: none
      device: /home/${USER}/Documents/db
```
