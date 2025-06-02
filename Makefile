DOCKER=docker compose
UP=up --build
DOWN=down -v
RM=rm -rf

# Paths
PATH_CERTS_DATA=/home/$(USER)/goinfre/certs_data
PATH_PROFILE_PIC=/home/$(USER)/goinfre/profile_pictures
PATH_AUTH=/home/$(USER)/goinfre/auth
PATH_FRIENDS=/home/$(USER)/goinfre/friends
PATH_GAME=/home/$(USER)/goinfre/game
PATH_PROMETHEUS_DATA=/home/$(USER)/goinfre/prometheus_data
PATH_GRAFANA_DATA=/home/$(USER)/goinfre/grafana_data

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

.PHONY: all re clean fclean init

init:
	@echo -e "$(GREEN)[INIT] Checking dependencies...$(NC)"
	@command -v docker >/dev/null 2>&1 || { echo -e "$(RED)[ERROR] Docker is not installed.$(NC)"; exit 1; }
	@command -v $(DOCKER) >/dev/null 2>&1 || { echo -e "$(RED)[ERROR] Docker Compose is not installed.$(NC)"; exit 1; }
	@command -v make >/dev/null 2>&1 || { echo -e "$(RED)[ERROR] Make is not installed.$(NC)"; exit 1; }
	@echo -e "$(GREEN)[INIT] All required tools are installed.$(NC)"

all: init
	@echo -e "$(GREEN)[ALL] Creating directories if they don't exist...$(NC)"
	@for dir in $(DIRS); do \
		[ -d "$$dir" ] || mkdir -p "$$dir"; \
	done
	@echo -e "$(GREEN)[ALL] Starting Docker containers...$(NC)"
	@$(DOCKER) $(UP)

re: fclean all

clean:
	@echo -e "$(GREEN)[CLEAN] Stopping and removing Docker containers...$(NC)"
	@$(DOCKER) $(DOWN)

fclean: clean
	@echo "$(GREEN)[FCLEAN] Deleting all generated directories...$(NC)"
	@for dir in $(DIRS); do \
		if [ "$$dir" != "$(PATH_GRAFANA_DATA)" ] && [ "$$dir" != "$(PATH_PROMETHEUS_DATA)" ]; then \
			echo "$$dir deleted"; \
			$(RM) "$$dir"; \
		fi \
	done
