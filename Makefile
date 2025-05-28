DOCKER = docker compose
UP = up --build
DOWN = down -v
RM = rm -rf

all:
	@if [ ! -d "/home/${USER}/data/" ]; then \
		mkdir /home/${USER}/sgoinfre/data/; \
	fi
	@if [ ! -d "/home/${USER}/data/cert/" ]; then \
		mkdir /home/${USER}/sgoinfre/data/cert/; \
	fi
	@if [ ! -d "/home/${USER}/data/db/" ]; then \
		mkdir /home/${USER}/sgoinfre/data/db/; \
	fi
	${DOCKER} ${UP}

up:
	${DOCKER} ${UP}

down:
	${DOCKER} ${DOWN}

re: down fclean all

clean:
	@${RM} /home/${USER}/sgoinfre/data/cert/
	@${RM} /home/${USER}/sgoinfre/data/db/

fclean: clean
	@${RM} /home/${USER}/sgoinfre/data/

.PHONY: all re clean fclean up down