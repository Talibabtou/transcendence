DOCKER:=docker compose
UP:=up --build
DOWN:=down -v
RM:=rm -rf
USER:=$(shell [ -n "$$SUDO_USER" ] && echo $$SUDO_USER || echo $$USER)
UID:=$(shell [ -n "$$SUDO_UID" ] && echo $$SUDO_UID || id -u)
GID:=$(shell [ -n "$$SUDO_GID" ] && echo $$SUDO_GID || id -g)

# Paths
PATH_CERTS_DATA=/home/$(USER)/goinfre/certs_data
PATH_PROFILE_PIC=/home/$(USER)/goinfre/profile_pictures
PATH_AUTH=/home/$(USER)/goinfre/auth
PATH_FRIENDS=/home/$(USER)/goinfre/friends
PATH_GAME=/home/$(USER)/goinfre/game
PATH_PROMETHEUS_DATA=/home/$(USER)/goinfre/prometheus_data
PATH_GRAFANA_DATA=/home/$(USER)/goinfre/grafana_data
ENV_WORK_LOCAL=/run/user/$(UID)/docker.sock:/var/run/docker.sock:ro
ENV_WORK_VM=/var/run/docker.sock:/var/run/docker.sock:ro

DIRS=$(PATH_CERTS_DATA) \
     $(PATH_PROFILE_PIC) \
     $(PATH_AUTH) \
     $(PATH_FRIENDS) \
     $(PATH_GAME) \
     $(PATH_PROMETHEUS_DATA) \
     $(PATH_GRAFANA_DATA)

# Colors
GREEN=\033[0;32m
RED=\033[0;31m
NC=\033[0m

.PHONY: all re clean fclean init prune vm re-vm

all: init
	@echo "$(GREEN)[ALL] Creating directories if they don't exist...$(NC)"
	@for dir in $(DIRS); do \
		[ -d "$$dir" ] || mkdir -p "$$dir"; \
	done
	@echo "$(GREEN)[ALL] Starting Docker containers...$(NC)"
	@ENV_WORK=$(ENV_WORK_LOCAL) UID=$(UID) GID=$(GID) $(DOCKER) $(UP)

vm:
	@echo "$(GREEN)[ALL] Creating directories if they don't exist...$(NC)"
	@for dir in $(DIRS); do \
		[ -d "$$dir" ] || mkdir -p "$$dir"; \
	done
	@echo "$(GREEN)[ALL] Starting Docker containers...$(NC)"
	@ENV_WORK=$(ENV_WORK_VM) UID=$(UID) GID=$(GID) $(DOCKER) $(UP)

init:
	@echo "$(GREEN)[INIT] Checking dependencies...$(NC)"
	@command -v docker >/dev/null 2>&1 || { echo -e "$(RED)[ERROR] Docker is not installed.$(NC)"; exit 1; }
	@command -v $(DOCKER) >/dev/null 2>&1 || { echo -e "$(RED)[ERROR] Docker Compose is not installed.$(NC)"; exit 1; }
	@command -v make >/dev/null 2>&1 || { echo -e "$(RED)[ERROR] Make is not installed.$(NC)"; exit 1; }
	@echo "$(GREEN)[INIT] All required tools are installed.$(NC)"

re: fclean all

re-vm: fclean vm

clean:
	@echo "$(GREEN)[CLEAN] Stopping and removing Docker containers...$(NC)"
	@ENV_WORK=$(ENV_WORK_VM) $(DOCKER) $(DOWN)
	@ENV_WORK=$(ENV_WORK_LOCAL) $(DOCKER) $(DOWN)

fclean: clean
	@echo "$(GREEN)[FCLEAN] Deleting all generated directories...$(NC)"
	@for dir in $(DIRS); do \
		if [ "$$dir" != "$(PATH_GRAFANA_DATA)" ] && [ "$$dir" != "$(PATH_PROMETHEUS_DATA)" ]; then \
			echo "$$dir deleted"; \
			$(RM) "$$dir"; \
		fi \
	done

prune:
	@docker builder prune -a
