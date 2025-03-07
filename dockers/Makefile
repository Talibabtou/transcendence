DOCKER = docker compose
DOCKER_FILE = ./srcs/docker-compose.yml

all: up

re: down fclean up

up:
	${DOCKER} -f ${DOCKER_FILE} up --build -d

down:
	${DOCKER} -f ${DOCKER_FILE} down

clean:
	${DOCKER} -f ${DOCKER_FILE} down -v

fclean: clean
	docker system prune -af

.PHONY: all up down clean fclean re