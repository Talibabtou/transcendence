import fetch from 'node-fetch';

const RED: string = '\x1b[31m';
const GREEN: string = '\x1b[32m';
const BOLD: string = '\x1b[1m';
const UNDERLINE: string  = '\x1b[4m';
const RESET: string = '\x1b[0m';

const authUrl: string = 'http://localhost:8080/api/v1/auth';
let token: string = '';
let count: number = 0;
let countFailed: number = 0;
let severalIssues: number = 0;
let issuesList = [];

console.log(`${BOLD}Test begin for path ${UNDERLINE}${authUrl}${RESET}`);
//Register bad password
{
    const name = 'Register bad password';
    count += 1;
    const user = {
        username: 'test',
        email: 'test@test.fr',
        password: 'T',
    }
    const response = await fetch(authUrl + '/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(user),
        });
    if (response.status === 500) {
        severalIssues += 1;
        issuesList.push(name);
        console.log(`   ${name}: ${RED}${BOLD}SEVERAL ISSUE${RESET}`);
    }
    else if (response.status !== 400) {
        countFailed += 1;
        console.log(`   ${name}: ${RED}failed${RESET}`);
    }
    else
        console.log(`   ${name}: ${GREEN}success${RESET}`);
}
//Register bad email
{
    const name = 'Register bad email';
    count += 1;
    const user = {
        username: 'test',
        email: 'test@test',
        password: 'Test123456789',
    }
    const response = await fetch(authUrl + '/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(user),
        });
    if (response.status === 500) {
        severalIssues += 1;
        issuesList.push(name);
        console.log(`   ${name}: ${RED}${BOLD}SEVERAL ISSUE${RESET}`);
    }
    else if (response.status !== 400) {
        countFailed += 1;
        console.log(`   ${name}: ${RED}failed${RESET}`);
    }
    else
        console.log(`   ${name}: ${GREEN}success${RESET}`);
}
//Register bad user
{
    const name = 'Register bad user';
    count += 1;
    const user = {
        username: 't',
        email: 'test@test.fr',
        password: 'Test123456789',
    }
    const response = await fetch(authUrl + '/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(user),
        });
    if (response.status === 500) {
        severalIssues += 1;
        issuesList.push(name);
        console.log(`   ${name}: ${RED}${BOLD}SEVERAL ISSUE${RESET}`);
    }
    else if (response.status !== 400) {
        countFailed += 1;
        console.log(`   ${name}: ${RED}failed${RESET}`);
    }
    else
        console.log(`   ${name}: ${GREEN}success${RESET}`);
}
//Register success
{
    const name = 'Register success';
    count += 1;
    const user = {
        username: 'test',
        email: 'test@test.fr',
        password: 'Test123456789',
    }
    const response = await fetch(authUrl + '/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(user),
        });
    if (response.status === 500) {
        severalIssues += 1;
        issuesList.push(name);
        console.log(`   ${name}: ${RED}${BOLD}SEVERAL ISSUE${RESET}`);
    }
    else if (response.status !== 201) {
        countFailed += 1;
        console.log(`   ${name}: ${RED}failed${RESET}`);
    }
    else
        console.log(`   ${name}: ${GREEN}success${RESET}`);
}
// ----------------------------------------------------------------
//Login failed
{
    const name = 'Login failed'
    count += 1;
    const user = {
        email: 'test@test.fr',
        password: 'Test12345678',
    }
    const response = await fetch(authUrl + '/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(user),
        });
    if (response.status === 500) {
        severalIssues += 1;
        issuesList.push(name);
        console.log(`   ${name}: ${RED}${BOLD}SEVERAL ISSUE${RESET}`);
    }
    else if (response.status !== 400 && response.status !== 401) {
        countFailed += 1;
        console.log(`   ${name}: ${RED}failed${RESET}`);
    }
    else
        console.log(`   ${name}: ${GREEN}success${RESET}`);
}
//Login success
{
    const name = 'Login success';
    count += 1;
    const user = {
        email: 'test@test.fr',
        password: 'Test123456789',
    }
    const response = await fetch(authUrl + '/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(user),
        });
    if (response.status === 500) {
        severalIssues += 1;
        issuesList.push(name);
        console.log(`   ${name}: ${RED}${BOLD}SEVERAL ISSUE${RESET}`);
    }
    else if (response.status !== 200) {
        countFailed += 1;
        console.log(`   ${name}: ${RED}failed${RESET}`);
    }
    else {
        const responseData: any = await response.json();
        token = responseData.token;
        console.log(`   ${name}: ${GREEN}success${RESET}`);
        console.log(`       Token: ${token}`);
    }
}
// ----------------------------------------------------------------
//Get users
{
    const name = 'Get users'
    count += 1;
    const response = await fetch(authUrl + '/user/me', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });
    if (response.status === 500) {
        severalIssues += 1;
        issuesList.push(name);
        console.log(`   ${name}: ${RED}${BOLD}SEVERAL ISSUE${RESET}`);
    }
    else if (response.status !== 200) {
        countFailed += 1;
        console.log(`   ${name}: ${RED}failed${RESET}`);
    }
    else
        console.log(`   ${name}: ${GREEN}success${RESET}`);
}
//Get user
{
    const name = 'Get user';
    count += 1;
    const response = await fetch(authUrl + '/user/me', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });
    if (response.status === 500) {
        severalIssues += 1;
        issuesList.push(name);
        console.log(`   ${name}: ${RED}${BOLD}SEVERAL ISSUE${RESET}`);
    }
    else if (response.status !== 200) {
        countFailed += 1;
        console.log(`   ${name}: ${RED}failed${RESET}`);
    }
    else
        console.log(`   ${name}: ${GREEN}success${RESET}`);
}
//Get user me
{
    const name = 'Get user me';
    count += 1;
    const response = await fetch(authUrl + '/user/me', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });
    if (response.status === 500) {
        severalIssues += 1;
        issuesList.push(name);
        console.log(`   ${name}: ${RED}${BOLD}SEVERAL ISSUE${RESET}`);
    }
    else if (response.status !== 200) {
        countFailed += 1;
        console.log(`   ${name}: ${RED}failed${RESET}`);
    }
    else
        console.log(`   ${name}: ${GREEN}success${RESET}`);
}
// ----------------------------------------------------------------
//Modify failed
{
    const name = 'Modify failed';
    count += 1;
    const modify = {
        email: "salut@salut"
    }
    const response = await fetch(authUrl + '/user', {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(modify),
        });
    if (response.status === 500) {
        severalIssues += 1;
        issuesList.push(name);
        console.log(`   ${name}: ${RED}${BOLD}SEVERAL ISSUE${RESET}`);
    }
    else if (response.status !== 400) {
        countFailed += 1;
        console.log(`   ${name}: ${RED}failed${RESET}`);
    }
    else
        console.log(`   ${name}: ${GREEN}success${RESET}`);
}
//Modify success
{
    const name = 'Modify success';
    count += 1;
    const modify = {
        email: "test@test.fr"
    }
    const response = await fetch(authUrl + '/user', {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(modify),
        });
    if (response.status === 500) {
        severalIssues += 1;
        issuesList.push(name);
        console.log(`   ${name}: ${RED}${BOLD}SEVERAL ISSUE${RESET}`);
    }
    else if (response.status !== 200) {
        countFailed += 1;
        console.log(`   ${name}: ${RED}failed${RESET}`);
    }
    else
        console.log(`   ${name}: ${GREEN}success${RESET}`);
}
// ----------------------------------------------------------------
//Logout success
{
    const name = 'Logout success';
    count += 1;
    const response = await fetch(authUrl + '/logout', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });
    if (response.status === 500) {
        severalIssues += 1;
        issuesList.push(name);
        console.log(`   ${name}: ${RED}${BOLD}SEVERAL ISSUE${RESET}`);
    }
    else if (response.status !== 204) {
        countFailed += 1;
        console.log(`   ${name}: ${RED}failed${RESET}`);
    }
    else {
        const user = {
            email: 'test@test.fr',
            password: 'Test123456789',
        }
        const response = await fetch(authUrl + '/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(user),
            });
        const responseData: any = await response.json();
        token = responseData.token;
        console.log(`   ${name}: ${GREEN}success${RESET}`);
        console.log(`       New token: ${token}`);
    }
}
// ----------------------------------------------------------------
//Delete failed
{
    const name = 'Delete failed';
    count += 1;
    const response = await fetch(authUrl + '/user', {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}4`,
        },
        });
    if (response.status === 500) {
        severalIssues += 1;
        issuesList.push(name);
        console.log(`   ${name}: ${RED}${BOLD}SEVERAL ISSUE${RESET}`);
    }
    else if (response.status === 204) {
        countFailed += 1;
        console.log(`   ${name}: ${RED}failed${RESET}`);
    }
    else
        console.log(`   ${name}: ${GREEN}success${RESET}`);
}
//Delete success
{
    const name = 'Delete success';
    count += 1;
    const response = await fetch(authUrl + '/user', {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
        });
    if (response.status === 500) {
        severalIssues += 1;
        issuesList.push(name);
        console.log(`   ${name}: ${RED}${BOLD}SEVERAL ISSUE${RESET}`);
    }
    else if (response.status !== 204) {
        countFailed += 1;
        console.log(`   ${name}: ${RED}failed${RESET}`);
    }
    else
        console.log(`   ${name}: ${GREEN}success${RESET}`);
}
console.log('');
console.log(`Total test: ${count - countFailed}/${count}`);
if (severalIssues > 0) {
    console.log(`${BOLD}Several issues: ${RED}${severalIssues}${RESET}`);
    for (let i = 0; i < severalIssues; i++) {
        console.log(`   ${i}: ${issuesList[i]}`);
    }
}
