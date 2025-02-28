1. Fastify first validates the request against the schema
2. If validation passes, the controller function is executed
3. The controller interacts with the database
4. The response is validated against the schema before being sent
