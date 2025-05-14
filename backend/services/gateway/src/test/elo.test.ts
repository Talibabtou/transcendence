import fetch from 'node-fetch';

const RED: string = '\x1b[31m';
const GREEN: string = '\x1b[32m';
const BOLD: string = '\x1b[1m';
const UNDERLINE: string = '\x1b[4m';
const RESET: string = '\x1b[0m';

const authUrl: string = 'http://localhost:8085/api/v1/auth';
const gameUrl: string = 'http://localhost:8085/api/v1/game';
let token: string = '';
let userId: string = '';
const user = {
  username: 'test',
  email: 'test@test.fr',
  password: '387a1fa356cc3c632ca23c41392bf1538777f13fc0f8ab21f15faf310e3b2087',
};
let count: number = 0;
let countFailed: number = 0;
let severalIssues: number = 0;
let issuesList = [];

console.log(`${BOLD}Test begin for ${UNDERLINE}elo${RESET}`);
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
  //Login user success
  {
    const name = 'Login user success';
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
        userId = responseData.id;
        console.log(
          `   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${GREEN}success (Code: ${response.status}) ✅${RESET}`
        );
        console.log(`       Token: ${token}`);
      }
    }
  }
  // ----------------------------------------------------------------
  //Get elos success
  {
    const name = 'Get elos success';
    count += 1;
    const method = 'GET';
    const path = `/elos?player=${userId}&offset=50&limit=22`;
    const response = await fetch(gameUrl + path, {
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
  //Get elo with id success
  {
    const name = 'Get elo with id success';
    count += 1;
    const method = 'GET';
    const path = `/elo/${userId}`;
    const response = await fetch(gameUrl + path, {
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
  //Get leaderboard success
  {
    const name = 'Get leaderboard success';
    count += 1;
    const method = 'GET';
    const path = `/leaderboard`;
    const response = await fetch(gameUrl + path, {
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
  // ----------------------------------------------------------------

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
