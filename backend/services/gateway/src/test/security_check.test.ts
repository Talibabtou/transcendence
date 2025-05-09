// security-check.js
import axios from 'axios';
import chalk from 'chalk';

const target = process.argv[2] || 'http://localhost:3000' // par défaut localhost

async function checkHeaders() {
  try {
    const res = await axios.get(target)
    const headers = res.headers

    console.log(chalk.blue('\n🔍 Headers de sécurité détectés :'))

    const checks:any = {
      'content-security-policy': 'Content-Security-Policy',
      'strict-transport-security': 'Strict-Transport-Security',
      'x-frame-options': 'X-Frame-Options',
      'x-content-type-options': 'X-Content-Type-Options',
      'referrer-policy': 'Referrer-Policy',
      'permissions-policy': 'Permissions-Policy',
    }

    for (const key in checks) {
      if (headers[key]) {
        console.log(chalk.green(`✅ ${checks[key]}: ${headers[key]}`))
      } else {
        console.log(chalk.red(`❌ ${checks[key]} manquant`))
      }
    }

  } catch (err: any) {
    console.error(chalk.red(`❌ Impossible d'accéder à ${target} : ${err.message}`))
  }
}

async function checkCors() {
  try {
    const res = await axios.options(target, {
      headers: {
        Origin: 'https://evil.com',
        'Access-Control-Request-Method': 'GET'
      }
    })

    const allowOrigin = res.headers['access-control-allow-origin']
    const allowCreds = res.headers['access-control-allow-credentials']

    console.log(chalk.blue('\n🔐 CORS Policy :'))

    if (allowOrigin === '*') {
      console.log(chalk.red('❌ Access-Control-Allow-Origin est "*", dangereux si credentials'))
    } else {
      console.log(chalk.green(`✅ Origin autorisée : ${allowOrigin}`))
    }

    if (allowCreds === 'true') {
      if (allowOrigin === '*') {
        console.log(chalk.red('❌ Credentials activés mais origin est "*", fail critique !'))
      } else {
        console.log(chalk.green('✅ Credentials acceptés avec origine restreinte'))
      }
    }

  } catch (err: any) {
    console.error(chalk.red('❌ Erreur lors du check CORS : ' + err.message))
  }
}

async function checkPayloadLimit() {
  try {
    const bigPayload = 'A'.repeat(1024 * 1024 * 2) // 2 Mo
    await axios.post(target, { data: bigPayload }, {
      headers: { 'Content-Type': 'application/json' }
    })

    console.log(chalk.red('❌ Aucun rejet de payload de 2 Mo (limite manquante ?)'))

  } catch (err: any) {
    if (err.response && err.response.status === 413) {
      console.log(chalk.green('✅ Payload limit détectée (413 Payload Too Large)'))
    } else {
      console.log(chalk.red('⚠️ Erreur inattendue lors du test de payload : ' + err.message))
    }
  }
}

async function runChecks() {
  console.log(chalk.yellow.bold(`\n=== Analyse de sécurité sur ${target} ===`))
  await checkHeaders()
  await checkCors()
  await checkPayloadLimit()
  console.log(chalk.yellow.bold('\n✔️ Check terminé\n'))
}

runChecks()
