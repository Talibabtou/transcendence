export async function addUser(request, reply) {
    try {
        const { username, password, email } = request.body;
        await request.server.db.run('INSERT INTO users (role, username, password, email, created_at) VALUES ("user", ?, ?, ?, CURRENT_TIMESTAMP);', [username, password, email]);
        request.server.log.info("User created successfully");
        return reply.code(201).send({
            success: true,
            message: 'User created successfully'
        });
    }
    catch (err) {
        let message = '';
        if (err.code === 'SQLITE_CONSTRAINT') {
            if (err.message.includes('users.email'))
                message = 'Email already exists';
            if (err.message.includes('users.username'))
                if (message == 'Email already exists')
                    message = message.concat(', ');
            message = message.concat('Username already exists');
            if (message == '')
                message = 'Unique constraint violation';
            request.server.log.error("User not created", err);
            return reply.code(409).send({
                success: false,
                message: message
            });
        }
        request.server.log.error("Internal server error", err);
        return reply.code(500).send({
            success: false,
            message: "Internal server error"
        });
    }
}
export async function getUsers(request, reply) {
    try {
        const users = await request.server.db.all('SELECT username, email FROM users');
        request.server.log.info("Users successfully obtained");
        return reply.code(200).send({
            success: true,
            message: "Users successfully obtained",
            data: {
                data: users
            }
        });
    }
    catch (err) {
        request.server.log.error("Internal server error", err);
        return reply.code(500).send({
            success: false,
            message: err.message
        });
    }
}
export async function getUser(request, reply) {
    try {
        const id = request.params.id;
        const user = await request.server.db.get('SELECT username, email FROM users WHERE id = ?', [id]);
        if (!user) {
            request.server.log.error("User not found");
            return reply.code(404).send({
                success: false,
                message: "User not found"
            });
        }
        request.server.log.info("User successfully obtained");
        return reply.code(200).send({
            success: true,
            message: "User successfully obtained",
            data: {
                user: user
            }
        });
    }
    catch (err) {
        if (err.message.includes('SQLITE_MISMATCH')) {
            request.server.log.error("Invalid ID format", err);
            return reply.code(400).send({
                success: false,
                message: err.message
            });
        }
        request.server.log.error("Internal server error", err);
        return reply.code(500).send({
            success: false,
            message: err.message
        });
    }
}
export async function deleteUser(request, reply) {
    try {
        const result = await request.server.db.get('SELECT * FROM users WHERE id = ?', [request.user.id]);
        if (!result) {
            request.server.log.error("User not found");
            return reply.code(404).send({
                success: false,
                message: "User not found"
            });
        }
        await request.server.db.run('DELETE FROM users WHERE id = ?', [request.user.id]);
        request.server.log.info("User successfully deleted");
        return reply.code(204).send();
    }
    catch (err) {
        if (err.message.includes('SQLITE_MISMATCH')) {
            request.server.log.error("Invalid ID format", err);
            return reply.code(400).send({
                success: false,
                message: err.message
            });
        }
        request.server.log.error("Internal server error", err);
        return reply.code(500).send({
            success: false,
            message: err.message
        });
    }
}
export async function modifyUser(request, reply) {
    try {
        let dataName = '';
        const { username, password, email } = request.body;
        let result = await request.server.db.get('SELECT id, username FROM users WHERE id = ?', [request.user.id]);
        if (!result) {
            request.server.log.error("User not found");
            return reply.code(404).send({
                success: false,
                message: "User not found"
            });
        }
        if (username) {
            dataName = 'username';
            await request.server.db.run('UPDATE users SET username = ?, updated_at = (CURRENT_TIMESTAMP) WHERE id = ?', [username, request.user.id]);
        }
        else if (password) {
            dataName = 'password';
            await request.server.db.run('UPDATE users SET password = ?, updated_at = (CURRENT_TIMESTAMP) WHERE id = ?', [password, request.user.id]);
        }
        else {
            dataName = 'email';
            await request.server.db.run('UPDATE users SET email = ?, updated_at = (CURRENT_TIMESTAMP) WHERE id = ?', [email, request.user.id]);
        }
        request.server.log.info(`${dataName} has been modified successfully`);
        return reply.code(200).send({
            success: true,
            message: `${dataName} has been modified successfully`
        });
    }
    catch (err) {
        let message = '';
        if (err.code === 'SQLITE_CONSTRAINT') {
            if (err.message.includes('users.email'))
                message = 'Email already exists';
            else if (err.message.includes('users.username'))
                message = 'Username already exists';
            else if (!message)
                message = 'Unique constraint violation';
            request.server.log.error(message, err);
            return reply.code(409).send({
                success: false,
                message: err.message
            });
        }
        else if (err.message.includes('SQLITE_MISMATCH')) {
            request.server.log.error("Invalid ID format", err);
            return reply.code(400).send({
                success: false,
                message: err.message
            });
        }
        request.server.log.error("Internal server error", err);
        return reply.code(500).send({
            success: false,
            message: err.message
        });
    }
}
export async function login(request, reply) {
    try {
        const { email, password } = request.body;
        const user = await request.server.db.get('SELECT id, role, username FROM users WHERE email = ? AND password = ?;', [email, password]);
        if (user == undefined) {
            request.server.log.error("Login failed: invalid email or password");
            return reply.code(401).send({
                success: false,
                message: 'Login failed: invalid email or password'
            });
        }
        await request.server.db.run('UPDATE users SET last_login = (CURRENT_TIMESTAMP) WHERE email = ? AND password = ?', [email, password]);
        const token = request.server.jwt.sign({ id: user.id, role: user.role });
        console.log({ token: token });
        return reply.code(200).send({
            success: true,
            message: "Authentication Success",
            data: {
                token: token,
                user: user
            }
        });
    }
    catch (err) {
        request.server.log.error("Internal server error", err);
        return reply.code(500).send({
            success: false,
            message: err.message
        });
    }
}
