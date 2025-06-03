import { WebSocket } from 'ws';
import { IId } from '../shared/types/gateway.types.js';
import { FastifyInstance, FastifyRequest } from 'fastify';

const connectedClients = new Map<string, WebSocket>();

// Rate limiting constants
const MAX_MESSAGES_PER_WINDOW = 10; // Max 10 messages
const RATE_LIMIT_WINDOW_MS = 5000; // Per 5 seconds
const userMessageTimestamps = new Map<string, number[]>(); // Stores timestamps of messages for each user

async function websocketRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/ws/status',
    {
      websocket: true,
      config: { auth: true },
    },
    (socket: WebSocket, req: FastifyRequest) => {
      const userFromJwt = req.user as IId;
      const userId = userFromJwt?.id;

      if (!userId) {
        fastify.log.warn('WebSocket connection missing userId after auth check. Terminating.', {
          requestId: req.id,
          ip: req.ip,
        });
        socket.send(JSON.stringify({ type: 'error', message: 'Authentication failed.' }));
        socket.terminate();
        return;
      }

      if (connectedClients.has(userId)) {
        fastify.log.info({
          msg: `User ${userId} reconnected or has existing connection. Terminating old one if different.`,
          requestId: req.id,
          userId,
        });
        const oldSocket = connectedClients.get(userId);
        if (oldSocket && oldSocket !== socket) {
          oldSocket.send(
            JSON.stringify({
              type: 'info',
              message: 'New connection established from another location. This session is closing.',
            })
          );
          oldSocket.terminate();
        }
      }

      connectedClients.set(userId, socket);
      fastify.log.info({
        msg: `User ${userId} connected via WebSocket. Total clients: ${connectedClients.size}`,
        userId,
        requestId: req.id,
      });

      const onlineUserIds = Array.from(connectedClients.keys());
      socket.send(JSON.stringify({ type: 'online_users_list', users: onlineUserIds }));

      for (const [id, clientSocket] of connectedClients.entries()) {
        if (id !== userId) {
          clientSocket.send(JSON.stringify({ type: 'user_online', userId }));
        }
      }

      socket.on('message', (rawMessage) => {
        try {
          const currentTime = Date.now();
          let timestamps = userMessageTimestamps.get(userId);

          if (!timestamps) {
            timestamps = [];
            userMessageTimestamps.set(userId, timestamps);
          }

          // Remove timestamps older than the window
          timestamps = timestamps.filter(ts => currentTime - ts < RATE_LIMIT_WINDOW_MS);
          userMessageTimestamps.set(userId, timestamps);

          if (timestamps.length >= MAX_MESSAGES_PER_WINDOW) {
            fastify.log.warn({
              msg: `User ${userId} exceeded rate limit. Message dropped.`,
              userId,
              requestId: req.id,
              messageCount: timestamps.length,
            });
            // Optionally send a message back to the client
            // socket.send(JSON.stringify({ type: 'error', message: 'Rate limit exceeded. Please slow down.' }));
            return; // Drop the message
          }

          timestamps.push(currentTime);

          const message = JSON.parse(rawMessage.toString());
          if (message.type === 'ping') {
            socket.send(JSON.stringify({ type: 'pong' }));
          } else {
            fastify.log.warn({ userId, requestId: req.id, message }, 'Received unhandled WebSocket message type');
          }
        } catch (err) {
					fastify.log.error(err);
        }
      });

      socket.on('close', (code, reason) => {
        connectedClients.delete(userId);
        userMessageTimestamps.delete(userId); // Clean up rate limit data on disconnect
        fastify.log.info({
          msg: `User ${userId} disconnected from WebSocket. Code: ${code}, Reason: ${reason.toString() || 'N/A'}. Total clients: ${connectedClients.size}`,
          userId,
          requestId: req.id,
        });
        for (const [id, clientSocket] of connectedClients.entries()) {
          clientSocket.send(JSON.stringify({ type: 'user_offline', userId }));
        }
      });

      socket.on('error', (error: Error) => {
        fastify.log.error({
          msg: `WebSocket error for user ${userId}. Removing from connected clients.`,
          error: error.message,
          stack: error.stack,
          userId,
          requestId: req.id,
        });
        if (connectedClients.has(userId)) {
          connectedClients.delete(userId);
          userMessageTimestamps.delete(userId); // Clean up rate limit data on error
          for (const [id, clientSocket] of connectedClients.entries()) {
            clientSocket.send(JSON.stringify({ type: 'user_offline', userId }));
          }
        }
      });
    }
  );
}

export default websocketRoutes;
