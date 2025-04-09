DOCKER = docker compose

all: up

re: down fclean up

up:
	${DOCKER} up

build:
	${DOCKER} up --build -d

down:
	${DOCKER} down

clean:
	${DOCKER} down -v

fclean: clean
	docker system prune -af

.PHONY: all up build down clean fclean re