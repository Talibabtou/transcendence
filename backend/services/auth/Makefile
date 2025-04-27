NPM = npm run
RM = rm -rf

all:
	@if [ ! -d "dist/" ]; then \
		mkdir dist; \
	fi
	@if [ ! -d "db/" ]; then \
		mkdir db; \
		touch db/revoked.json; \
	fi
	@${NPM} build || { echo "Build failed"; exit 1; }
	@${NPM} start

re: fclean all

prettier:
	npx prettier . --write

linter:
	npx eslint . --fix

format: linter prettier

clean:
	clear

fclean: clean
	@${RM} dist/
	@${RM} db/

.PHONY: all re clean fclean prettier linter format