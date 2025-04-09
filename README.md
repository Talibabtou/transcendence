# transcendance
## steps
### Install necessary tools
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
### Install typescript env
```bash
npm init -y // generate .json files

// API
npm i --save-dev @types/node
npm install @types/node typescript fastify @types/node-fetch@2 @fastify/jwt @fastify/static @fastify/multipart @fastify/rate-limit 

// AUTH
npm i --save-dev @types/node
npm install @types/node typescript fastify sqlite3 sqlite @fastify/jwt 

// PROFIL
npm i --save-dev @types/node
npm install @types/node typescript fastify @fastify/jwt @fastify/static @fastify/multipart

// FRIENDS
npm i --save-dev @types/node
npm install @types/node typescript fastify sqlite3 sqlite @fastify/jwt 

npx tsc --init // generate tsconfig file
```
- configure tsconfig.json
```bash
npx tsc // compile .ts to .js
```
### Docker-compose
```bash
services:
  api_gateway:
    build: ./requirements/api
    container_name: api
    port:
      - 8080:8080
    networks:
      - transcendance-net
    restart: always
  auth:
    build: ./requirements/auth
    container_name: auth
    expose:
      - 8082
    networks:
      - transcendance-net
    restart: always
  game:
    build: ./requirements/game
    container_name: game
    expose:
      - 8083
    networks:
      - transcendance-net
    restart: always

networks:
  transcendance-net:
    driver: bridge
```