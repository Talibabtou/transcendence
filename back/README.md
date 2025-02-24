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
npm install @types/node typescript fastify dotenv zod @types/node-fetch@2 // install necessary modules
npx tsc --init // generate tsconfig file
```
- configure tsconfig.json
```bash
npx tsc // compile .ts to .js
```
