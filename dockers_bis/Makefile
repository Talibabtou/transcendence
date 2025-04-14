DOCKER = docker compose

all: up

re: fclean up

up:
	@if [ ! -d "/home/${USER}/Documents/db" ]; then \
		mkdir -p /home/${USER}/Documents/db; \
	fi
	${DOCKER} up --build -d

down:
	${DOCKER} down --remove-orphans

clean:
	${DOCKER} down -v

fclean: clean
	docker system prune -af

.PHONY: all up down clean fclean re