import fetch from 'node-fetch';

const RED: string = '\x1b[31m';
const GREEN: string = '\x1b[32m';
const BOLD: string = '\x1b[1m';
const UNDERLINE: string = '\x1b[4m';
const RESET: string = '\x1b[0m';

const authUrl: string = 'http://localhost:8085/api/v1/auth';
const friendsUrl: string = 'http://localhost:8085/api/v1/friends';
let token1: string = '';
let userId1: string = '';
const user1 = {
  username: 'test',
  email: 'test@test.fr',
  password: 'Test123456789',
};
let token2: string = '';
let userId2: string = '';
const user2 = {
  username: 'test2',
  email: 'test2@test.fr',
  password: 'Test123456789',
};
let count: number = 0;
let countFailed: number = 0;
let severalIssues: number = 0;
let issuesList = [];

console.log(`${BOLD}Test begin for ${UNDERLINE}friends${RESET}`);
try {
  //Register user1 success
  {
    const name = 'Register user1 success';
    count += 1;
    const method = 'POST';
    const path = '/register';
    const response = await fetch(authUrl + path, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(user1),
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
      body: JSON.stringify(user1),
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
        token1 = responseData.token;
        userId1 = responseData.id;
        console.log(
          `   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${GREEN}success (Code: ${response.status}) ✅${RESET}`
        );
        console.log(`       Token: ${token1}`);
      }
    }
  }
  // ----------------------------------------------------------------
  //Register user2 success
  {
    const name = 'Register user2 success';
    count += 1;
    const method = 'POST';
    const path = '/register';
    const response = await fetch(authUrl + path, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(user2),
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
  //Login user2 success
  {
    const name = 'Login user2 success';
    count += 1;
    const method = 'POST';
    const path = '/login';
    const response = await fetch(authUrl + path, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(user2),
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
        token2 = responseData.token;
        userId2 = responseData.id;
        console.log(
          `   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${GREEN}success (Code: ${response.status}) ✅${RESET}`
        );
        console.log(`       Token: ${token2}`);
      }
    }
  }
  //-----------------------------------------------------------------
  //Create relation success
  {
    const name = 'Create relation success';
    count += 1;
    const method = 'POST';
    const path = '/create';
    const id = userId2;
    const response = await fetch(friendsUrl + path, {
      method: method,
      headers: {
        Authorization: `Bearer ${token1}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id }),
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
  // ----------------------------------------------------------------
  //Check relation false
  {
    const name = 'Check relation false';
    count += 1;
    const method = 'GET';
    const path = `/check/${userId1}`;
    const response = await fetch(friendsUrl + path, {
      method: method,
      headers: {
        Authorization: `Bearer ${token2}`,
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
      const responseData: any = await response.json();
      if (!responseData.status) {
        console.log(
          `   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${GREEN}success (Code: ${response.status}) ✅${RESET}`
        );
      } else {
        countFailed += 1;
        console.log(
          `   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}failed (Code: ${response.status}) expected false ❌${RESET}`
        );
      }
    }
  }
  // ----------------------------------------------------------------
  //Accept relation success
  {
    const name = 'Accept relation success';
    count += 1;
    const method = 'PATCH';
    const path = '/accept';
    const id = userId1;
    const response = await fetch(friendsUrl + path, {
      method: method,
      headers: {
        Authorization: `Bearer ${token2}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id }),
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
    } else {
      console.log(
        `   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${GREEN}success (Code: ${response.status}) ✅${RESET}`
      );
    }
  }
  // ----------------------------------------------------------------
  //Check relation true
  {
    const name = 'Check relation true';
    count += 1;
    const method = 'GET';
    const path = `/check/${userId2}`;
    const response = await fetch(friendsUrl + path, {
      method: method,
      headers: {
        Authorization: `Bearer ${token1}`,
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
      const responseData: any = await response.json();
      const status = responseData.status;
      if (status) {
        console.log(
          `   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${GREEN}success (Code: ${response.status}) ✅${RESET}`
        );
      } else {
        countFailed += 1;
        console.log(
          `   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}failed (Code: ${response.status}) expected false ❌${RESET}`
        );
      }
    }
  }
  // ----------------------------------------------------------------
  //Get all relations with id success
  {
    const name = 'Get all relations with id success';
    count += 1;
    const method = 'GET';
    const path = `/all/${userId2}`;
    const response = await fetch(friendsUrl + path, {
      method: method,
      headers: {
        Authorization: `Bearer ${token1}`,
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
  //Get all relations me success
  {
    const name = 'Get all relations me success';
    count += 1;
    const method = 'GET';
    const path = `/all/me`;
    const response = await fetch(friendsUrl + path, {
      method: method,
      headers: {
        Authorization: `Bearer ${token1}`,
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
  //Delete relation success
  {
    const name = 'Delete all relations user1 success';
    count += 1;
    const method = 'DELETE';
    const path = `/delete/${userId2}`;
    const response = await fetch(friendsUrl + path, {
      method: method,
      headers: {
        Authorization: `Bearer ${token1}`,
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
    } else {
      console.log(
        `   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${GREEN}success (Code: ${response.status}) ✅${RESET}`
      );
    }
  }
  //Delete all relations user1 failed
  {
    const name = 'Delete all relations user1 failed';
    count += 1;
    const method = 'DELETE';
    const path = '/delete/all';
    const id = userId1;
    const response = await fetch(friendsUrl + path, {
      method: method,
      headers: {
        Authorization: `Bearer ${token1}`,
      },
    });
    if (response.status === 500) {
      severalIssues += 1;
      countFailed += 1;
      issuesList.push(name);
      console.log(
        `   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}${BOLD}SEVERAL ISSUE (Code: ${response.status}) ❌${RESET}`
      );
    } else if (response.status === 204) {
      countFailed += 1;
      console.log(
        `   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${RED}failed (Code: ${response.status}) expected 404 NOT_FOUND❌${RESET}`
      );
    } else {
      console.log(
        `   ${UNDERLINE}${name}${RESET} (${BOLD}${method}${RESET})(${BOLD}${path}${RESET}): ${GREEN}success (Code: ${response.status}) ✅${RESET}`
      );
    }
  }
  // ----------------------------------------------------------------
  //Delete user1 success
  {
    const name = 'Delete user1 success';
    count += 1;
    const method = 'DELETE';
    const path = '/user';
    const response = await fetch(authUrl + path, {
      method: method,
      headers: {
        Authorization: `Bearer ${token1}`,
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
  //Delete user2 success
  {
    const name = 'Delete user2 success';
    count += 1;
    const method = 'DELETE';
    const path = '/user';
    const response = await fetch(authUrl + path, {
      method: method,
      headers: {
        Authorization: `Bearer ${token2}`,
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
