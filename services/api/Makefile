NPM = npm run
RM = rm -rf

all:
	@if [ ! -d "dist/" ]; then \
		mkdir dist; \
	fi
	@${NPM} build
	@${NPM} start

re: fclean all

clean:
	@clear

fclean: clean
	@${RM} dist/

.PHONY: all re clean fclean