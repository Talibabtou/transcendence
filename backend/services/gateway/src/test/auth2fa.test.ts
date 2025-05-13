import fetch from 'node-fetch';
import readlineSync from 'readline-sync';
import qrcode from 'qrcode-terminal';

const RED: string = '\x1b[31m';
const GREEN: string = '\x1b[32m';
const BOLD: string = '\x1b[1m';
const UNDERLINE: string = '\x1b[4m';
const RESET: string = '\x1b[0m';

const authUrl: string = 'http://localhost:8085/api/v1/auth';
let token: string = '';
let id = '';
let count: number = 0;
let countFailed: number = 0;
let severalIssues: number = 0;
let issuesList = [];

console.log(`${BOLD}Test begin for ${UNDERLINE}auth2fa${RESET}`);
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
      console.log(
        `   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}${BOLD}SEVERAL ISSUE (Code: ${response.status}) ❌${RESET}`
      );
    } else if (response.status !== 201) {
      countFailed += 1;
      console.log(
        `   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}failed (Code: ${response.status}) ❌${RESET}`
      );
    } else
      console.log(
        `   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${GREEN}success (Code: ${response.status}) ✅${RESET}`
      );
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
      console.log(
        `   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}${BOLD}SEVERAL ISSUE (Code: ${response.status}) ❌${RESET}`
      );
    } else if (response.status !== 200) {
      countFailed += 1;
      console.log(
        `   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}failed (Code: ${response.status}) ❌${RESET}`
      );
    } else {
      const responseData: any = await response.json();
      const status = responseData.status;
      if (status) {
        console.log(
          `   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}failed (Code: ${response.status}) expected a jwt ❌${RESET}`
        );
      } else {
        token = responseData.token;
        id = responseData.id;
        console.log(
          `   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${GREEN}success (Code: ${response.status}) ✅${RESET}`
        );
        console.log(`       Token: ${token}`);
      }
    }
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
      console.log(
        `   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}${BOLD}SEVERAL ISSUE (Code: ${response.status}) ❌${RESET}`
      );
    } else if (response.status !== 200 && response.status !== 204) {
      countFailed += 1;
      console.log(
        `   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}failed (Code: ${response.status}) ❌${RESET}`
      );
    } else {
      if (response.status === 200) {
        const responseData: any = await response.json();
        qrcode.generate(responseData.otpauth, { small: true });
      }
      console.log(
        `   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${GREEN}success (Code: ${response.status}) ✅${RESET}`
      );
    }
  }
  // ----------------------------------------------------------------
  //2FA validate loop
  {
    let twofaCode = '';
    while (1) {
      const name = '2FA validate loop';
      count += 1;
      const method = 'POST';
      const path = '/2fa/validate';
      twofaCode = readlineSync.question('Enter 2FA code (enter skip to break the loop): ') as string;
      if (twofaCode === 'skip') {
        break;
      }
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
        console.log(
          `   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}${BOLD}SEVERAL ISSUE (Code: ${response.status}) ❌${RESET}`
        );
      } else if (response.status !== 200) {
        countFailed += 1;
        console.log(
          `   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}failed (Code: ${response.status}) ❌${RESET}`
        );
      } else {
        console.log(
          `   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${GREEN}success (Code: ${response.status}) ✅${RESET}`
        );
      }
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
      console.log(
        `   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}${BOLD}SEVERAL ISSUE (Code: ${response.status}) ❌${RESET}`
      );
    } else if (response.status !== 204) {
      countFailed += 1;
      console.log(
        `   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}failed (Code: ${response.status}) ❌${RESET}`
      );
    } else
      console.log(
        `   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${GREEN}success (Code: ${response.status}) ✅${RESET}`
      );
  }
  console.log('');
  console.log(`Total test: ${count - countFailed}/${count}`);
  if (severalIssues > 0) {
    console.log(`${BOLD}Several issues: ${RED}${severalIssues}${RESET}`);
    for (let i = 0; i < severalIssues; i++) {
      console.log(`   ${i + 1}: ${issuesList[i]}`);
    }
  }
} catch (err) {
  console.log('Fatal error', err);
}
