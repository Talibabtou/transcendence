NPM = npm run
RM = rm -rf

all:
	@if [ ! -d "dist/" ]; then \
		mkdir dist; \
	fi
	@${NPM} build || { echo "Build failed"; exit 1; }
	@${NPM} start

re: fclean all

prettier:
	npx prettier . --write

linter:
	npx eslint .

clean:


fclean: clean
	@${RM} dist/

.PHONY: all re clean fclean prettier linter