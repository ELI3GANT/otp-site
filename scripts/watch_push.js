#!/usr/bin/env node
/**
 * Debounced auto-commit + push when files change.
 *
 *   npm run watch:push
 *
 * Detached HEAD (common in Cursor worktrees): set where to push, e.g.
 *   WATCH_PUSH_TARGET=main npm run watch:push
 */
const chokidar = require('chokidar');
const { execSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEBOUNCE_MS = Number(process.env.WATCH_PUSH_DEBOUNCE_MS) || 4000;
const targetRef = (process.env.WATCH_PUSH_TARGET || '').trim();

function sh(cmd, inherit = true) {
  return execSync(cmd, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: inherit ? 'inherit' : 'pipe'
  });
}

function getBranch() {
  return sh('git rev-parse --abbrev-ref HEAD', false).trim();
}

function pushCommand() {
  const branch = getBranch();
  if (branch === 'HEAD') {
    if (!targetRef) {
      console.error(
        '[watch-push] Detached HEAD. Run on a branch, or set WATCH_PUSH_TARGET=main (pushes to origin/main).'
      );
      return null;
    }
    return `git push origin HEAD:${targetRef}`;
  }
  return 'git push';
}

let timer = null;

function sync() {
  const status = sh('git status --porcelain', false);
  if (!status.trim()) {
    console.log('[watch-push] nothing to commit');
    return;
  }

  console.log('\n[watch-push] committing…');
  try {
    sh('git add -A');
    const msg = `auto: ${new Date().toISOString()}`;
    sh(`git commit -m ${JSON.stringify(msg)}`);
  } catch {
    console.log('[watch-push] commit skipped (empty or hook failure)');
    return;
  }

  const push = pushCommand();
  if (!push) return;

  console.log('[watch-push] pushing…');
  try {
    sh(push);
    console.log('[watch-push] done');
  } catch {
    console.error('[watch-push] push failed — pull/rebase or fix auth, then retry');
  }
}

const watcher = chokidar.watch('.', {
  cwd: ROOT,
  ignored: [
    '**/node_modules/**',
    '**/.git/**',
    '**/.cursor/**',
    '**/.DS_Store',
    '**/*.log',
    '**/.env',
    '**/.env.*',
    '**/test-report.xml'
  ],
  ignoreInitial: true
});

watcher.on('all', () => {
  clearTimeout(timer);
  timer = setTimeout(sync, DEBOUNCE_MS);
});

const branch = getBranch();
console.log(
  `[watch-push] watching ${ROOT}\n` +
    `  branch: ${branch}${branch === 'HEAD' && targetRef ? ` → push to origin/${targetRef}` : ''}\n` +
    `  debounce: ${DEBOUNCE_MS}ms`
);
