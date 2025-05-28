DOCKER = docker compose
UP = up --build
DOWN = down -v
RM = rm -rf

all:
	${DOCKER} ${UP}

up:
	${DOCKER} ${UP}

down:
	${DOCKER} ${DOWN}

re: down fclean all

clean:

fclean: clean

.PHONY: all re clean fclean up down