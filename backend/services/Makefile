AUTH_PATH = "./auth"
FRIENDS_PATH = "./friends"
GAME_PATH = "./game"
GATEWAY_PATH = "./gateway"
PROFIL = "./profil"
CMD_FORMAT = format
CMD_AUDIT = audit
CMD_AUDIT_FIX = audit-fix

all: infos

infos:
	@echo "Makefile commands: format, audit, audit-fix"
format:
	${MAKE} ${CMD_FORMAT} -C ${AUTH_PATH}
	${MAKE} ${CMD_FORMAT} -C ${FRIENDS_PATH}
	${MAKE} ${CMD_FORMAT} -C ${GAME_PATH}
	${MAKE} ${CMD_FORMAT} -C ${GATEWAY_PATH}
	${MAKE} ${CMD_FORMAT} -C ${PROFIL}

audit:
	${MAKE} ${CMD_AUDIT} -C ${AUTH_PATH}
	${MAKE} ${CMD_AUDIT} -C ${FRIENDS_PATH}
	${MAKE} ${CMD_AUDIT} -C ${GAME_PATH}
	${MAKE} ${CMD_AUDIT} -C ${GATEWAY_PATH}
	${MAKE} ${CMD_AUDIT} -C ${PROFIL}

audit-fix:
	${MAKE} ${CMD_AUDIT_FIX} -C ${AUTH_PATH}
	${MAKE} ${CMD_AUDIT_FIX} -C ${FRIENDS_PATH}
	${MAKE} ${CMD_AUDIT_FIX} -C ${GAME_PATH}
	${MAKE} ${CMD_AUDIT_FIX} -C ${GATEWAY_PATH}
	${MAKE} ${CMD_AUDIT_FIX} -C ${PROFIL}

.PHONY: all infos format audit audit-fix