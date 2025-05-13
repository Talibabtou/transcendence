import fetch from 'node-fetch';
import fs from 'fs';
import FormData from 'form-data';
import p from 'path';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const BOLD = '\x1b[1m';
const UNDERLINE = '\x1b[4m';
const RESET = '\x1b[0m';
const authUrl = 'http://localhost:8085/api/v1/auth';
const profilUrl = 'http://localhost:8085/api/v1/profile';
let token = '';
let id = '';
let count = 0;
let countFailed = 0;
let severalIssues = 0;
let issuesList = [];
console.log(`${BOLD}Test begin for ${UNDERLINE}profile${RESET}`);
try {
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
    //Upload image success
    {
        const name = 'Upload image success';
        count += 1;
        const method = 'POST';
        const path = '/uploads';
        const form = new FormData();
        const imgPath = p.join(p.resolve(), '/uploads/mario.jpg');
        if (!fs.existsSync(imgPath)) {
            throw new Error(`File not found: ${imgPath}`);
        }
        form.append('image', fs.createReadStream(imgPath));
        const response = await fetch(profilUrl + path, {
            method: method,
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: form,
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
        else {
            console.log(`   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${GREEN}success (Code: ${response.status}) ✅${RESET}`);
        }
    }
    // ----------------------------------------------------------------
    //Delete image success
    {
        const name = 'Delete image success';
        count += 1;
        const method = 'DELETE';
        const path = '/uploads';
        const response = await fetch(profilUrl + path, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            method: method,
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
        }
    }
    // ----------------------------------------------------------------
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
