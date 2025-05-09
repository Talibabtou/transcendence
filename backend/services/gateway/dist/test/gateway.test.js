import fetch from 'node-fetch';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const BOLD = '\x1b[1m';
const UNDERLINE = '\x1b[4m';
const RESET = '\x1b[0m';
const authUrl = 'http://localhost:8080/api/v1/auth';
const profilUrl = 'http://localhost:8080/api/v1/profil';
const gatewayUrl = 'http://localhost:8080/api/v1';
let token = '';
let userId = '';
const user = {
    username: 'test',
    email: 'test@test.fr',
    password: 'Test123456789',
};
let count = 0;
let countFailed = 0;
let severalIssues = 0;
let issuesList = [];
console.log(`${BOLD}Test begin for ${UNDERLINE}gateway${RESET}`);
try {
    //Register user success
    {
        const name = 'Register user success';
        count += 1;
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
    //Login user1 success
    {
        const name = 'Login user1 success';
        count += 1;
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
                userId = responseData.id;
                console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${GREEN}success (Code: ${response.status}) ✅${RESET}`);
                console.log(`       Token: ${token}`);
            }
        }
    }
    // ----------------------------------------------------------------
    //Get pic
    {
        const name = 'Get pic';
        count += 1;
        const method = 'GET';
        const path = `/pics/ee39d4ea-bca8-b517-1fd6-168def8e547f`;
        const response = await fetch(gatewayUrl + path, {
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
    //Get pics
    {
        const name = 'Get pics';
        count += 1;
        const method = 'GET';
        const path = `/pics`;
        const response = await fetch(gatewayUrl + path, {
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
    //Check microservices success
    {
        const name = 'Check microservices success';
        count += 1;
        const method = 'GET';
        const path = `/health`;
        const response = await fetch(gatewayUrl + path, {
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
    //Check gateway success
    {
        const name = 'Check gateway success';
        count += 1;
        const method = 'GET';
        const path = `/check`;
        const response = await fetch(gatewayUrl + path, {
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
    //Delete user success
    {
        const name = 'Delete user success';
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
    // ----------------------------------------------------------------
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
