export async function addUser(request, reply) {
    try {
        const { username, password, email } = request.body;
        await request.server.db.run('INSERT INTO users (role, username, password, email, created_at) VALUES ("user", ?, ?, ?, CURRENT_TIMESTAMP);', [username, password, email]);
        return reply.code(201).send();
    }
    catch (err) {
        if (err.message.includes('SQLITE_MISMATCH'))
            return reply.code(400).send();
        else if (err.message.includes('SQLITE_CONSTRAINT'))
            return reply.code(409).send();
        return reply.code(500).send();
    }
}
export async function getUsers(request, reply) {
    try {
        const users = await request.server.db.all('SELECT username, email FROM users');
        if (!users)
            return reply.code(404).send();
        return reply.code(200).send({ users: users });
    }
    catch (err) {
        return reply.code(500).send();
    }
}
export async function getUser(request, reply) {
    try {
        const id = request.params.id;
        const user = await request.server.db.get('SELECT username, email FROM users WHERE id = ?', [id]);
        if (!user)
            return reply.code(404).send();
        return reply.code(200).send({ user: user });
    }
    catch (err) {
        if (err.message.includes('SQLITE_MISMATCH'))
            return reply.code(400).send();
        return reply.code(500).send();
    }
}
export async function deleteUser(request, reply) {
    try {
        const result = await request.server.db.get('SELECT * FROM users WHERE id = ?', [request.user.id]);
        if (!result)
            return reply.code(404).send();
        await request.server.db.run('DELETE FROM users WHERE id = ?', [request.user.id]);
        return reply.code(204).send();
    }
    catch (err) {
        if (err.message.includes('SQLITE_MISMATCH'))
            return reply.code(400).send();
        return reply.code(500).send();
    }
}
export async function modifyUser(request, reply) {
    try {
        const { username, password, email } = request.body;
        let result = await request.server.db.get('SELECT id, username FROM users WHERE id = ?', [request.user.id]);
        if (!result)
            return reply.code(404).send();
        if (username)
            await request.server.db.run('UPDATE users SET username = ?, updated_at = (CURRENT_TIMESTAMP) WHERE id = ?', [username, request.user.id]);
        else if (password)
            await request.server.db.run('UPDATE users SET password = ?, updated_at = (CURRENT_TIMESTAMP) WHERE id = ?', [password, request.user.id]);
        else
            await request.server.db.run('UPDATE users SET email = ?, updated_at = (CURRENT_TIMESTAMP) WHERE id = ?', [email, request.user.id]);
        return reply.code(200).send();
    }
    catch (err) {
        if (err.message.includes('SQLITE_CONSTRAINT'))
            return reply.code(409).send();
        else if (err.message.includes('SQLITE_MISMATCH'))
            return reply.code(400).send();
        return reply.code(500).send();
    }
}
export async function login(request, reply) {
    try {
        const { email, password } = request.body;
        const user = await request.server.db.get('SELECT id, role, username FROM users WHERE email = ? AND password = ?;', [email, password]);
        if (user == undefined)
            return reply.code(401).send();
        await request.server.db.run('UPDATE users SET last_login = (CURRENT_TIMESTAMP) WHERE email = ? AND password = ?', [email, password]);
        const token = request.server.jwt.sign({ id: user.id, role: user.role });
        console.log({ token: token });
        return reply.code(200).send({
            token: token,
            user: user
        });
    }
    catch (err) {
        return reply.code(500).send();
    }
}
