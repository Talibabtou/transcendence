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
npm install @types/node typescript fastify fastify-sqlite-typed dotenv zod @types/node-fetch@2 // install necessary modules
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
    build: ./requirements/api_gateway
    container_name: api_gateway
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
      - auth-net
    volumes:
    - auth-volume:/db
    restart: always
  auth_db:
    build: ./requirements/auth_db
    container_name: auth_db
    volumes:
      - auth-volume:/db
    expose:
      - 8090
    networks:
      - auth-net
    restart: always
  game:
    build: ./requirements/game
    container_name: game
    volumes:
      - game:/db
    expose:
      - 8083
    networks:
      - transcendance-net
      - game-net
    restart: always
  auth_db:
    build: ./requirements/game_db
    container_name: game_db
    volumes:
      - game-volume:/db
    expose:
      - 8090
    networks:
      - game-net
    restart: always

volumes:
  auth-volume:
  game-volume:

networks:
  transcendance-net:
    driver: bridge
  auth-net:
    driver: bridge
  game-net:
    driver: bridge
```
