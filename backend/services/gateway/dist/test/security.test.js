// enhanced-security-check.js
import axios from 'axios';
import chalk from 'chalk';
const target = 'http://localhost:8085/api/v1/check';
const checks = {
    'content-security-policy': 'Content-Security-Policy',
    'strict-transport-security': 'Strict-Transport-Security',
    'x-frame-options': 'X-Frame-Options',
    'x-content-type-options': 'X-Content-Type-Options',
    'referrer-policy': 'Referrer-Policy',
    'permissions-policy': 'Permissions-Policy',
    'cross-origin-opener-policy': 'Cross-Origin-Opener-Policy',
    'cross-origin-resource-policy': 'Cross-Origin-Resource-Policy',
    'origin-agent-cluster': 'Origin-Agent-Cluster',
    'cache-control': 'Cache-Control',
};
function validateHeaderValue(key, value) {
    const expectedValues = {
        'x-frame-options': ['deny', 'sameorigin'],
        'x-content-type-options': ['nosniff'],
        'referrer-policy': ['no-referrer', 'strict-origin-when-cross-origin'],
    };
    const expected = expectedValues[key];
    if (expected && !expected.includes(value.toLowerCase())) {
        return `⚠️ Unexpected value: "${value}", expected: ${expected.join(', ')}`;
    }
    return null;
}
async function checkHeaders() {
    const res = await axios.get(target);
    const headers = res.headers;
    console.log(chalk.blue('\n🔍 Security headers detected :'));
    for (const key in checks) {
        const headerValue = headers[key];
        if (headerValue) {
            const warning = validateHeaderValue(key, headerValue);
            if (warning) {
                console.log(chalk.hex('#FFA500')(`${checks[key]}: ${headerValue} ${warning}`));
            }
            else {
                console.log(chalk.green(`${checks[key]}: ${headerValue} ✅`));
            }
        }
        else {
            console.log(chalk.red(`${checks[key]} missing ❌`));
        }
    }
}
async function checkCors() {
    const res = await axios.options(target, {
        headers: {
            Origin: 'https://evil.com',
            'Access-Control-Request-Method': 'GET',
        },
    });
    const allowOrigin = res.headers['access-control-allow-origin'];
    const allowCreds = res.headers['access-control-allow-credentials'];
    const vary = res.headers['vary'];
    console.log(chalk.blue('\n🔐 CORS Policy :'));
    if (allowOrigin === '*') {
        console.log(chalk.red('Access-Control-Allow-Origin is "*", dangerous if credentials ❌'));
    }
    else {
        console.log(chalk.green(`Origin allowed : ${allowOrigin} ✅`));
    }
    if (allowCreds === 'true') {
        if (allowOrigin === '*') {
            console.log(chalk.red('Credentials enabled but origin is "*", critical fail ! ❌'));
        }
        else {
            console.log(chalk.green('Credentials accepted with restricted origin ✅'));
        }
    }
    if (!vary || !vary.includes('Origin')) {
        console.log(chalk.red('Vary: Origin header missing ❌ (can lead to CORS cache poisoning)'));
    }
}
async function checkPayloadLimit() {
    try {
        const bigPayload = 'A'.repeat(1024 * 1024 * 2); // 2 Mo
        await axios.post(target, { data: bigPayload }, {
            headers: { 'Content-Type': 'application/json' },
        });
        console.log(chalk.red('No 2 MB payload rejection (missing limit?) ❌'));
    }
    catch (err) {
        if (err.response && err.response.status === 413) {
            console.log(chalk.green('Payload limit detected (413 Payload Too Large) ✅'));
        }
        else {
            console.log(chalk.red('Unexpected error during the payload test: ' + err.message + ' ❌'));
        }
    }
}
async function checkHttpMethods() {
    console.log(chalk.blue('\n🚫 HTTP Methods check :'));
    const methods = ['TRACE', 'PUT'];
    for (const method of methods) {
        try {
            await axios.request({ url: target, method: method });
            console.log(chalk.red(`${method} method allowed ❌`));
        }
        catch (err) {
            if (err.response && [403, 405, 501].includes(err.response.status)) {
                console.log(chalk.green(`${method} method blocked ✅`));
            }
            else {
                console.log(chalk.red(`${method} method error ❌: ${err.message}`));
            }
        }
    }
}
async function safeExec(name, fn) {
    try {
        await fn();
    }
    catch (err) {
        console.error(chalk.red(`${name} failed ❌ : ${err.message}`));
    }
}
async function runChecks() {
    console.log(chalk.yellow.bold(`\n=== Security analyse for ${target} ===`));
    await safeExec('Header Check', checkHeaders);
    await safeExec('CORS Check', checkCors);
    await safeExec('Payload Limit Check', checkPayloadLimit);
    await safeExec('Method Restriction Check', checkHttpMethods);
    console.log(chalk.yellow.bold('\nCheck done ✅\n'));
}
runChecks();
