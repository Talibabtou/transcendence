NPM = npm run
RM = rm -rf

all:
	@if [ ! -d "dist/" ]; then \
		mkdir dist; \
	fi
	@if [ ! -d "db/" ]; then \
		mkdir db; \
	fi
	@${NPM} build || { echo "Build failed"; exit 1; }
	@${NPM} start

re: fclean all

clean:


fclean: clean
	@${RM} dist/

.PHONY: all re clean fclean