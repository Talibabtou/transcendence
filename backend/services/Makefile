AUTH_PATH = "./auth"
FRIENDS_PATH = "./friends"
GAME_PATH = "./game"
GATEWAY_PATH = "./gateway"
PROFILE = "./profile"
CMD_FORMAT = format
CMD_AUDIT = audit
CMD_AUDIT_FIX = audit-fix
CMD_INSTALL = install

all: infos

infos:
	@echo "Makefile commands: format, audit, audit-fix"
format:
	${MAKE} ${CMD_FORMAT} -C ${AUTH_PATH}
	${MAKE} ${CMD_FORMAT} -C ${FRIENDS_PATH}
	${MAKE} ${CMD_FORMAT} -C ${GAME_PATH}
	${MAKE} ${CMD_FORMAT} -C ${GATEWAY_PATH}
	${MAKE} ${CMD_FORMAT} -C ${PROFILE}

audit:
	${MAKE} ${CMD_AUDIT} -C ${AUTH_PATH}
	${MAKE} ${CMD_AUDIT} -C ${FRIENDS_PATH}
	${MAKE} ${CMD_AUDIT} -C ${GAME_PATH}
	${MAKE} ${CMD_AUDIT} -C ${GATEWAY_PATH}
	${MAKE} ${CMD_AUDIT} -C ${PROFILE}

audit-fix:
	${MAKE} ${CMD_AUDIT_FIX} -C ${AUTH_PATH}
	${MAKE} ${CMD_AUDIT_FIX} -C ${FRIENDS_PATH}
	${MAKE} ${CMD_AUDIT_FIX} -C ${GAME_PATH}
	${MAKE} ${CMD_AUDIT_FIX} -C ${GATEWAY_PATH}
	${MAKE} ${CMD_AUDIT_FIX} -C ${PROFILE}

install:
	${MAKE} ${CMD_INSTALL} -C ${AUTH_PATH}
	${MAKE} ${CMD_INSTALL} -C ${FRIENDS_PATH}
	${MAKE} ${CMD_INSTALL} -C ${GAME_PATH}
	${MAKE} ${CMD_INSTALL} -C ${GATEWAY_PATH}
	${MAKE} ${CMD_INSTALL} -C ${PROFILE}

.PHONY: all infos format audit audit-fix install