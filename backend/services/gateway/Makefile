NPM = npm run
RM = rm -rf
INSTALL = npm install
AUDIT = npm audit

all:
	@if [ ! -d "dist/" ]; then \
		mkdir dist; \
	fi
	@${NPM} build || { echo "Build failed"; exit 1; }
	@${NPM} start

test_auth: clean
	@${NPM} build || { echo "Build failed"; exit 1; }
	@${NPM} test_auth

test_auth2fa: clean
	@${NPM} build || { echo "Build failed"; exit 1; }
	@${NPM} test_auth2fa

test_friends: clean
	@${NPM} build || { echo "Build failed"; exit 1; }
	@${NPM} test_friends

test_profil: clean
	@${NPM} build || { echo "Build failed"; exit 1; }
	@${NPM} test_profil

test_gateway: clean
	@${NPM} build || { echo "Build failed"; exit 1; }
	@${NPM} test_gateway

test_elo: clean
	@${NPM} build || { echo "Build failed"; exit 1; }
	@${NPM} test_elo

infos:
	@echo "Makefile commands:  infos, re, clean, fclean, prettier, linter, format, install, audit, audit-fix, test"

re: fclean install all 

audit:
	@${AUDIT}

audit-fix:
	@${AUDIT} fix

install:
	@${INSTALL}

prettier:
	npx prettier . --write

linter:
	npx eslint . --fix

format: install linter prettier

clean:
	clear

fclean: clean
	@${RM} node_modules/
	@${RM} dist/

.PHONY: all re clean fclean prettier linter format install audit audit-fix infos test_auth test_auth2fa test_friends test_profil test_gateway