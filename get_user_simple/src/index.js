#!/usr/bin/env node
const readline = require('readline');
const CONFIG = require('./config');
const { getAllUsers } = require('./aggregator');
const { printTable, printJson } = require('./output');
const { redactKey } = require('./util/retry');

function promptForApiKey() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    // Attempt to disable echo by turning off output temporarily
    const question = 'Enter API key: ';
    if (process.stdin.isTTY && process.stdout.isTTY) {
      const mutableStdout = new (require('stream').Writable)({
        write: (chunk, encoding, callback) => {
          if (!rl.muted) process.stdout.write(chunk, encoding);
          callback();
        }
      });
      const rlHidden = readline.createInterface({ input: process.stdin, output: mutableStdout, terminal: true });
      rlHidden.question(question, (answer) => {
        rlHidden.close();
        console.log();
        resolve(answer.trim());
      });
      rlHidden._writeToOutput = function _writeToOutput() { /* no-echo */ };
      rlHidden.muted = true;
      return;
    }

    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function hasFlag(name) {
  return process.argv.includes(name);
}

async function main() {
  try {
    let apiKey = process.env.API_KEY;
    if (!apiKey) {
      apiKey = await promptForApiKey();
    }
    if (!apiKey || !apiKey.trim()) {
      console.error('API key is required.');
      process.exitCode = 1;
      return;
    }

    const useJson = hasFlag('--json');

    const { users, regionsCovered } = await getAllUsers(apiKey.trim());

    if (useJson) {
      printJson(users);
    } else {
      printTable(users);
    }

    console.log(`\nTotal users: ${users.length} (regions covered: ${regionsCovered})`);
    process.exitCode = 0;
  } catch (err) {
    const code = err && (err.exitCode || (err.status === 401 || err.status === 403 ? 1 : (err.status ? 2 : undefined)));
    if (err && (err.status === 401 || err.status === 403)) {
      console.error('Invalid API key or insufficient permissions');
      process.exitCode = 1;
      return;
    }

    if (code === 3) {
      console.error(`Configuration error: ${err.message}`);
      process.exitCode = 3;
      return;
    }
    if (code === 2 || (err && err.code)) {
      console.error(`Network error: ${err.message || err}`);
      process.exitCode = 2;
      return;
    }
    console.error(err && err.message ? err.message : String(err));
    process.exitCode = 2;
  }
}

main();
