export async function addUser(request, reply) {
    try {
        const { username, password, email } = request.body;
        await request.server.db.run('BEGIN TRANSACTION');
        const result = await request.server.db.run('INSERT INTO users (username, password, email, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP);', [username, password, email]);
        await request.server.db.run('COMMIT');
        const user = await request.server.db.get('SELECT id, username FROM users WHERE email = ?', [email]);
        return reply.code(201).send({ data: user }); // User created successfully
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
            await request.server.db.run('ROLLBACK');
            return reply.code(409).send({ message: message, error: err.message }); // User not created
        }
        await request.server.db.run('ROLLBACK');
        return reply.code(500).send({ error: err.message }); // Internal server error
    }
}
export async function getUsers(request, reply) {
    try {
        const users = await request.server.db.all('SELECT username, email FROM users');
        return reply.code(200).send({ data: users }); // Users successfully obtained
    }
    catch (err) {
        return reply.code(500).send({ error: err.message }); // Internal server error
    }
}
export async function getUser(request, reply) {
    try {
        const id = request.params.id;
        const result = await request.server.db.get('SELECT username, email FROM users WHERE id = ?', [id]);
        if (!result)
            return reply.code(404).send(); // User not found
        return reply.code(200).send({ data: result }); // User successfully obtained
    }
    catch (err) {
        if (err.message.includes('SQLITE_MISMATCH'))
            return reply.code(400).send({ error: err.message }); // Invalid ID format
        return reply.code(500).send({ error: err.message }); // Internal server error
    }
}
export async function deleteUser(request, reply) {
    try {
        const id = request.params.id;
        const result = await request.server.db.get('SELECT * FROM users WHERE id = ?', [id]);
        if (!result)
            return reply.code(404).send(); // User not found
        await request.server.db.run('BEGIN TRANSACTION');
        await request.server.db.run('DELETE FROM users WHERE id = ?', [id]);
        await request.server.db.run('COMMIT');
        return reply.code(204).send(); // User successfully deleted
    }
    catch (err) {
        if (err.message.includes('SQLITE_MISMATCH')) {
            await request.server.db.run('ROLLBACK');
            return reply.code(400).send({ error: err.message }); // Invalid ID format
        }
        await request.server.db.run('ROLLBACK');
        return reply.code(500).send({ error: err.message }); // Internal server error
    }
}
export async function modifyUser(request, reply) {
    try {
        let dataName = '';
        const id = request.params.id;
        const { username, password, email } = request.body;
        let result = await request.server.db.get('SELECT id, username FROM users WHERE id = ?', [id]);
        if (!result)
            return reply.code(404).send(); // User not found
        if (username) {
            dataName = 'username';
            await request.server.db.run('BEGIN TRANSACTION');
            await request.server.db.run('UPDATE users SET username = ?, updated_at = (CURRENT_TIMESTAMP) WHERE id = ?', [username, id]);
            await request.server.db.run('COMMIT');
        }
        else if (password) {
            dataName = 'password';
            await request.server.db.run('BEGIN TRANSACTION');
            await request.server.db.run('UPDATE users SET password = ?, updated_at = (CURRENT_TIMESTAMP) WHERE id = ?', [password, id]);
            await request.server.db.run('COMMIT');
        }
        else {
            dataName = 'email';
            await request.server.db.run('BEGIN TRANSACTION');
            await request.server.db.run('UPDATE users SET email = ?, updated_at = (CURRENT_TIMESTAMP) WHERE id = ?', [email, id]);
            await request.server.db.run('COMMIT');
        }
        return reply.code(200).send({ message: `${dataName} has been modified successfully`, data: result, }); // Has been modified successfully
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
            await request.server.db.run('ROLLBACK');
            return reply.code(409).send({ message: message, error: err.message }); // SQLITE CONSTRAINT
        }
        else if (err.message.includes('SQLITE_MISMATCH')) {
            await request.server.db.run('ROLLBACK');
            return reply.code(400).send({ error: err.message }); // Invalid ID format
        }
        await request.server.db.run('ROLLBACK');
        return reply.code(500).send({ error: err.message }); // Internal server error
    }
}
export async function login(request, reply) {
    try {
        const { email, password } = request.body;
        const result = await request.server.db.get('SELECT id, username FROM users WHERE email = ? AND password = ?;', [email, password]);
        if (result == undefined || result.lastID == 0)
            return reply.code(401).send(); // Invalid email or password
        await request.server.db.run('BEGIN TRANSACTION');
        await request.server.db.run('UPDATE users SET last_login = (CURRENT_TIMESTAMP) WHERE email = ? AND password = ?', [email, password]);
        await request.server.db.run('COMMIT');
        return reply.code(201).send({ data: result }); // Login success
    }
    catch (err) {
        await request.server.db.run('ROLLBACK');
        return reply.code(500).send({ error: err.message }); // Internal server error
    }
}
