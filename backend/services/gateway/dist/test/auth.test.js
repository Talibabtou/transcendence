import fetch from 'node-fetch';
import readlineSync from 'readline-sync';
import qrcode from 'qrcode-terminal';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const BOLD = '\x1b[1m';
const UNDERLINE = '\x1b[4m';
const RESET = '\x1b[0m';
const authUrl = 'http://localhost:8085/api/v1/auth';
let token = '';
let id = '';
let count = 0;
let countFailed = 0;
let severalIssues = 0;
let issuesList = [];
console.log(`${BOLD}Test begin for ${UNDERLINE}auth${RESET}`);
try {
    //Register bad password
    {
        const name = 'Register bad password';
        count += 1;
        const user = {
            username: 'test',
            email: 'test@test.fr',
            password: 'T',
        };
        const method = 'POST';
        const path = '/register';
        const response = await fetch(authUrl + path, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(user),
        });
        if (response.status === 500) {
            severalIssues += 1;
            countFailed += 1;
            issuesList.push(name);
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}${BOLD}SEVERAL ISSUE (Code: ${response.status}) ❌${RESET}`);
        }
        else if (response.status !== 400) {
            countFailed += 1;
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}failed (Code: ${response.status}) ❌${RESET}`);
        }
        else
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${GREEN}success (Code: ${response.status}) ✅${RESET}`);
    }
    //Register bad email
    {
        const name = 'Register bad email';
        count += 1;
        const user = {
            username: 'test',
            email: 'test@test',
            password: '387a1fa356cc3c632ca23c41392bf1538777f13fc0f8ab21f15faf310e3b2087',
        };
        const method = 'POST';
        const path = '/register';
        const response = await fetch(authUrl + path, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(user),
        });
        if (response.status === 500) {
            severalIssues += 1;
            countFailed += 1;
            issuesList.push(name);
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}${BOLD}SEVERAL ISSUE (Code: ${response.status}) ❌${RESET}`);
        }
        else if (response.status !== 400) {
            countFailed += 1;
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}failed (Code: ${response.status}) ❌${RESET}`);
        }
        else
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${GREEN}success (Code: ${response.status}) ✅${RESET}`);
    }
    //Register bad user
    {
        const name = 'Register bad user';
        count += 1;
        const user = {
            username: 't',
            email: 'test@test.fr',
            password: '387a1fa356cc3c632ca23c41392bf1538777f13fc0f8ab21f15faf310e3b2087',
        };
        const method = 'POST';
        const path = '/register';
        const response = await fetch(authUrl + path, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(user),
        });
        if (response.status === 500) {
            severalIssues += 1;
            countFailed += 1;
            issuesList.push(name);
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}${BOLD}SEVERAL ISSUE (Code: ${response.status}) ❌${RESET}`);
        }
        else if (response.status !== 400) {
            countFailed += 1;
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}failed (Code: ${response.status}) ❌${RESET}`);
        }
        else
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${GREEN}success (Code: ${response.status}) ✅${RESET}`);
    }
    //Register success
    {
        const name = 'Register success';
        count += 1;
        const user = {
            username: 'test',
            email: 'test@test.fr',
            password: '387a1fa356cc3c632ca23c41392bf1538777f13fc0f8ab21f15faf310e3b2087',
        };
        const method = 'POST';
        const path = '/register';
        const response = await fetch(authUrl + path, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(user),
        });
        if (response.status === 500) {
            severalIssues += 1;
            countFailed += 1;
            issuesList.push(name);
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}${BOLD}SEVERAL ISSUE (Code: ${response.status}) ❌${RESET}`);
        }
        else if (response.status !== 201) {
            countFailed += 1;
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}failed (Code: ${response.status}) ❌${RESET}`);
        }
        else
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${GREEN}success (Code: ${response.status}) ✅${RESET}`);
    }
    // ----------------------------------------------------------------
    //Login bad credentials
    {
        const name = 'Login bad credentials';
        count += 1;
        const user = {
            email: 'test@test.fr',
            password: 'Test12345678',
        };
        const method = 'POST';
        const path = '/login';
        const response = await fetch(authUrl + path, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(user),
        });
        if (response.status === 500) {
            severalIssues += 1;
            countFailed += 1;
            issuesList.push(name);
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}${BOLD}SEVERAL ISSUE (Code: ${response.status}) ❌${RESET}`);
        }
        else if (response.status !== 400 && response.status !== 401) {
            countFailed += 1;
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}failed (Code: ${response.status}) ❌${RESET}`);
        }
        else
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${GREEN}success (Code: ${response.status}) ✅${RESET}`);
    }
    //Login success
    {
        const name = 'Login success';
        count += 1;
        const user = {
            email: 'test@test.fr',
            password: '387a1fa356cc3c632ca23c41392bf1538777f13fc0f8ab21f15faf310e3b2087',
        };
        const method = 'POST';
        const path = '/login';
        const response = await fetch(authUrl + path, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(user),
        });
        if (response.status === 500) {
            severalIssues += 1;
            countFailed += 1;
            issuesList.push(name);
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}${BOLD}SEVERAL ISSUE (Code: ${response.status}) ❌${RESET}`);
        }
        else if (response.status !== 200) {
            countFailed += 1;
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}failed (Code: ${response.status}) ❌${RESET}`);
        }
        else {
            const responseData = await response.json();
            const status = responseData.status;
            if (status) {
                console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}failed (Code: ${response.status}) expected a jwt ❌${RESET}`);
            }
            else {
                token = responseData.token;
                id = responseData.id;
                console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${GREEN}success (Code: ${response.status}) ✅${RESET}`);
                console.log(`       Token: ${token}`);
            }
        }
    }
    // ----------------------------------------------------------------
    //Get users success
    {
        const name = 'Get users success';
        count += 1;
        const method = 'GET';
        const path = '/users';
        const response = await fetch(authUrl + path, {
            method: method,
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (response.status === 500) {
            severalIssues += 1;
            countFailed += 1;
            issuesList.push(name);
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}${BOLD}SEVERAL ISSUE (Code: ${response.status}) ❌${RESET}`);
        }
        else if (response.status !== 200) {
            countFailed += 1;
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}failed (Code: ${response.status}) ❌${RESET}`);
        }
        else
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${GREEN}success (Code: ${response.status}) ✅${RESET}`);
    }
    //Get user success
    {
        const name = 'Get user success';
        count += 1;
        const method = 'GET';
        const path = `/user/${id}`;
        const response = await fetch(authUrl + path, {
            method: method,
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (response.status === 500) {
            severalIssues += 1;
            countFailed += 1;
            issuesList.push(name);
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}${BOLD}SEVERAL ISSUE (Code: ${response.status}) ❌${RESET}`);
        }
        else if (response.status !== 200) {
            countFailed += 1;
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}failed (Code: ${response.status}) ❌${RESET}`);
        }
        else
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${GREEN}success (Code: ${response.status}) ✅${RESET}`);
    }
    //Get user me success
    {
        const name = 'Get user me success';
        count += 1;
        const method = 'GET';
        const path = '/user/me';
        const response = await fetch(authUrl + path, {
            method: method,
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (response.status === 500) {
            severalIssues += 1;
            countFailed += 1;
            issuesList.push(name);
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}${BOLD}SEVERAL ISSUE (Code: ${response.status}) ❌${RESET}`);
        }
        else if (response.status !== 200) {
            countFailed += 1;
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}failed (Code: ${response.status}) ❌${RESET}`);
        }
        else
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${GREEN}success (Code: ${response.status}) ✅${RESET}`);
    }
    //Get id success
    {
        const name = 'Get id success';
        count += 1;
        const method = 'GET';
        const path = `/id/test`;
        const response = await fetch(authUrl + path, {
            method: method,
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (response.status === 500) {
            severalIssues += 1;
            countFailed += 1;
            issuesList.push(name);
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}${BOLD}SEVERAL ISSUE (Code: ${response.status}) ❌${RESET}`);
        }
        else if (response.status !== 200) {
            countFailed += 1;
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}failed (Code: ${response.status}) ❌${RESET}`);
        }
        else
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${GREEN}success (Code: ${response.status}) ✅${RESET}`);
    }
    // ----------------------------------------------------------------
    //Modify bad email schema
    {
        const name = 'Modify bad email schema';
        count += 1;
        const modify = {
            email: 'salut@salut',
        };
        const method = 'PATCH';
        const path = '/user';
        const response = await fetch(authUrl + path, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(modify),
        });
        if (response.status === 500) {
            severalIssues += 1;
            countFailed += 1;
            issuesList.push(name);
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}${BOLD}SEVERAL ISSUE (Code: ${response.status}) ❌${RESET}`);
        }
        else if (response.status !== 400) {
            countFailed += 1;
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}failed (Code: ${response.status}) ❌${RESET}`);
        }
        else
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${GREEN}success (Code: ${response.status}) ✅${RESET}`);
    }
    //Modify bad param
    {
        const name = 'Modify bad param';
        count += 1;
        const modify = {
            coucou: 'salut@salut',
        };
        const method = 'PATCH';
        const path = '/user';
        const response = await fetch(authUrl + path, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(modify),
        });
        if (response.status === 500) {
            severalIssues += 1;
            countFailed += 1;
            issuesList.push(name);
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}${BOLD}SEVERAL ISSUE (Code: ${response.status}) ❌${RESET}`);
        }
        else if (response.status === 200) {
            countFailed += 1;
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}failed (Code: ${response.status}) ❌${RESET}`);
        }
        else
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${GREEN}success (Code: ${response.status}) ✅${RESET}`);
    }
    //Modify too much params
    {
        const name = 'Modify too much params';
        count += 1;
        const modify = {
            email: 'test@test.fr',
            password: '387a1fa356cc3c632ca23c41392bf1538777f13fc0f8ab21f15faf310e3b2087',
            username: 'test',
            vacance: 'Thailand',
            mange: 'une pomme',
        };
        const method = 'PATCH';
        const path = '/user';
        const response = await fetch(authUrl + path, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(modify),
        });
        if (response.status === 500) {
            severalIssues += 1;
            countFailed += 1;
            issuesList.push(name);
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}${BOLD}SEVERAL ISSUE (Code: ${response.status}) ❌${RESET}`);
        }
        else if (response.status !== 400) {
            countFailed += 1;
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}failed (Code: ${response.status}) ❌${RESET}`);
        }
        else
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${GREEN}success (Code: ${response.status}) ✅${RESET}`);
    }
    //Modify success
    {
        const name = 'Modify success';
        count += 1;
        const modify = {
            email: 'test@test.fr',
        };
        const method = 'PATCH';
        const path = '/user';
        const response = await fetch(authUrl + path, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(modify),
        });
        if (response.status === 500) {
            severalIssues += 1;
            countFailed += 1;
            issuesList.push(name);
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}${BOLD}SEVERAL ISSUE (Code: ${response.status}) ❌${RESET}`);
        }
        else if (response.status !== 200) {
            countFailed += 1;
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}failed (Code: ${response.status}) ❌${RESET}`);
        }
        else
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${GREEN}success (Code: ${response.status}) ✅${RESET}`);
    }
    //2FA generated success
    {
        const name = '2FA generated success';
        count += 1;
        const method = 'GET';
        const path = '/2fa/generate';
        const response = await fetch(authUrl + path, {
            method: method,
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (response.status === 500) {
            severalIssues += 1;
            countFailed += 1;
            issuesList.push(name);
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}${BOLD}SEVERAL ISSUE (Code: ${response.status}) ❌${RESET}`);
        }
        else if (response.status !== 200 && response.status !== 204) {
            countFailed += 1;
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}failed (Code: ${response.status}) ❌${RESET}`);
        }
        else {
            if (response.status === 200) {
                const responseData = await response.json();
                qrcode.generate(responseData.otpauth, { small: true });
            }
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${GREEN}success (Code: ${response.status}) ✅${RESET}`);
        }
    }
    //2FA validate
    {
        const name = '2FA validate';
        count += 1;
        const method = 'POST';
        const path = '/2fa/validate';
        const twofaCode = readlineSync.question('Enter 2FA code: ');
        const response = await fetch(authUrl + path, {
            method: method,
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ twofaCode }),
        });
        if (response.status === 500) {
            severalIssues += 1;
            countFailed += 1;
            issuesList.push(name);
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}${BOLD}SEVERAL ISSUE (Code: ${response.status}) ❌${RESET}`);
        }
        else if (response.status !== 200) {
            countFailed += 1;
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}failed (Code: ${response.status}) ❌${RESET}`);
        }
        else {
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${GREEN}success (Code: ${response.status}) ✅${RESET}`);
        }
    }
    // ----------------------------------------------------------------
    //Logout success
    {
        const name = 'Logout success';
        count += 1;
        const method = 'POST';
        const path = '/logout';
        const response = await fetch(authUrl + path, {
            method: method,
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (response.status === 500) {
            severalIssues += 1;
            countFailed += 1;
            issuesList.push(name);
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}${BOLD}SEVERAL ISSUE (Code: ${response.status}) ❌${RESET}`);
        }
        else if (response.status !== 204) {
            countFailed += 1;
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}failed (Code: ${response.status}) ❌${RESET}`);
        }
        else {
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${GREEN}success (Code: ${response.status}) ✅${RESET}`);
            console.log(`       Revoked token: ${token}`);
        }
    }
    //Login success with 2FA
    {
        const name = 'Login success with 2FA';
        count += 1;
        const user = {
            email: 'test@test.fr',
            password: '387a1fa356cc3c632ca23c41392bf1538777f13fc0f8ab21f15faf310e3b2087',
        };
        const method = 'POST';
        const path = '/login';
        const response = await fetch(authUrl + path, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(user),
        });
        if (response.status === 500) {
            severalIssues += 1;
            countFailed += 1;
            issuesList.push(name);
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}${BOLD}SEVERAL ISSUE (Code: ${response.status}) ❌${RESET}`);
        }
        else if (response.status !== 200) {
            countFailed += 1;
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}failed (Code: ${response.status}) ❌${RESET}`);
        }
        else {
            const responseData = await response.json();
            const status = responseData.status;
            if (!status) {
                console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}failed (Code: ${response.status}) expected a status "NEED_2FA"❌${RESET}`);
            }
            else {
                token = responseData.token;
                id = responseData.id;
                console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${GREEN}success (Code: ${response.status}) ✅${RESET}`);
                console.log(`       2FA token: ${token}`);
            }
        }
    }
    // ----------------------------------------------------------------
    //2FA validate
    {
        const name = '2FA validate';
        count += 1;
        const method = 'POST';
        const path = '/2fa/validate';
        const twofaCode = readlineSync.question('Enter 2FA code: ');
        const response = await fetch(authUrl + path, {
            method: method,
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ twofaCode }),
        });
        if (response.status === 500) {
            severalIssues += 1;
            countFailed += 1;
            issuesList.push(name);
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}${BOLD}SEVERAL ISSUE (Code: ${response.status}) ❌${RESET}`);
        }
        else if (response.status !== 200) {
            countFailed += 1;
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}failed (Code: ${response.status}) ❌${RESET}`);
        }
        else {
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${GREEN}success (Code: ${response.status}) ✅${RESET}`);
        }
    }
    // ----------------------------------------------------------------
    //Login success with 2FA
    {
        const name = 'Login success with 2FA';
        count += 1;
        const user = {
            email: 'test@test.fr',
            password: '387a1fa356cc3c632ca23c41392bf1538777f13fc0f8ab21f15faf310e3b2087',
        };
        const method = 'POST';
        const path = '/login';
        const response = await fetch(authUrl + path, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(user),
        });
        if (response.status === 500) {
            severalIssues += 1;
            countFailed += 1;
            issuesList.push(name);
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}${BOLD}SEVERAL ISSUE (Code: ${response.status}) ❌${RESET}`);
        }
        else if (response.status !== 200) {
            countFailed += 1;
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}failed (Code: ${response.status}) ❌${RESET}`);
        }
        else {
            const responseData = await response.json();
            const status = responseData.status;
            if (status) {
                console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}failed (Code: ${response.status}) expected a jwt ❌${RESET}`);
            }
            else {
                token = responseData.token;
                id = responseData.id;
                console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${GREEN}success (Code: ${response.status}) ✅${RESET}`);
                console.log(`       Token: ${token}`);
            }
        }
    }
    // ----------------------------------------------------------------
    //Delete failed
    {
        const name = 'Delete failed';
        count += 1;
        const method = 'DELETE';
        const path = '/user';
        const response = await fetch(authUrl + path, {
            method: method,
            headers: {
                Authorization: `Bearer ${token}4`,
            },
        });
        if (response.status === 500) {
            severalIssues += 1;
            countFailed += 1;
            issuesList.push(name);
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}${BOLD}SEVERAL ISSUE (Code: ${response.status}) ❌${RESET}`);
        }
        else if (response.status === 204) {
            countFailed += 1;
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}failed (Code: ${response.status}) ❌${RESET}`);
        }
        else
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${GREEN}success (Code: ${response.status}) ✅${RESET}`);
    }
    //Delete success
    {
        const name = 'Delete success';
        count += 1;
        const method = 'DELETE';
        const path = '/user';
        const response = await fetch(authUrl + path, {
            method: method,
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (response.status === 500) {
            severalIssues += 1;
            countFailed += 1;
            issuesList.push(name);
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}${BOLD}SEVERAL ISSUE (Code: ${response.status}) ❌${RESET}`);
        }
        else if (response.status !== 204) {
            countFailed += 1;
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}failed (Code: ${response.status}) ❌${RESET}`);
        }
        else
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${GREEN}success (Code: ${response.status}) ✅${RESET}`);
    }
    console.log('');
    console.log(`Total test: ${count - countFailed}/${count}`);
    if (severalIssues > 0) {
        console.log(`${BOLD}Several issues: ${RED}${severalIssues}${RESET}`);
        for (let i = 0; i < severalIssues; i++) {
            console.log(`   ${i + 1}: ${issuesList[i]}`);
        }
    }
}
catch (err) {
    console.log('Fatal error', err);
}
