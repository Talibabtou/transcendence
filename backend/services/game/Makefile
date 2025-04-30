NPM = npm run
RM = rm -rf
INSTALL = npm install
AUDIT = npm audit

all:
	@if [ ! -d "dist/" ]; then \
		mkdir dist; \
	fi
	@if [ ! -d "db/" ]; then \
		mkdir db; \
	fi
	@${NPM} build || { echo "Build failed"; exit 1; }
	@${NPM} start

infos:
	@echo "Makefile commands:  infos, re, clean, fclean, prettier, linter, format, install, audit, audit-fix"

re: fclean all

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
	@${RM} dist/
	@${RM} db/

.PHONY: all re clean fclean prettier linter format install audit audit-fix infos