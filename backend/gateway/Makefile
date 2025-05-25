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

test_auth:
	@${NPM} build || { echo "Build failed"; exit 1; }
	@${NPM} test_auth

test_auth2fa:
	@${NPM} build || { echo "Build failed"; exit 1; }
	@${NPM} test_auth2fa

test_friends:
	@${NPM} build || { echo "Build failed"; exit 1; }
	@${NPM} test_friends

test_profile:
	@${NPM} build || { echo "Build failed"; exit 1; }
	@${NPM} test_profile

test_gateway:
	@${NPM} build || { echo "Build failed"; exit 1; }
	@${NPM} test_gateway

test_elo:
	@${NPM} build || { echo "Build failed"; exit 1; }
	@${NPM} test_elo

test_match:
	@${NPM} build || { echo "Build failed"; exit 1; }
	@${NPM} test_match

test_goal:
	@${NPM} build || { echo "Build failed"; exit 1; }
	@${NPM} test_goal

test_tournament:
	@${NPM} build || { echo "Build failed"; exit 1; }
	@${NPM} test_tournament

test_security:
	@${NPM} build || { echo "Build failed"; exit 1; }
	@${NPM} test_security

infos:
	@echo "Makefile commands:  infos, re, clean, fclean, prettier, linter, format, install, audit, audit-fix, test_friends, test_profile, test_gateway, test_match, test_goal, test_tournament, test_security"

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

.PHONY: all re clean fclean prettier linter format install audit audit-fix infos test_auth test_auth2fa test_friends test_profile test_gateway test_match test_goal test_security