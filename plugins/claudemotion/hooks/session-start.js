#!/usr/bin/env node
/* Claudemotion SessionStart hook.
 * In a folder set up with /claudemotion:setup (it has claudemotion.json),
 * load the video-session rules into context. Elsewhere it prints nothing.
 * Fails open: any error means no output and exit 0. */
'use strict';
const fs = require('fs');
const path = require('path');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', d => { input += d; });
process.stdin.on('end', () => {
  try {
    let cwd = process.cwd();
    try { const j = JSON.parse(input || '{}'); if (j.cwd) cwd = j.cwd; } catch (_) { /* keep process cwd */ }
    const file = path.join(cwd, 'claudemotion.json');
    if (!fs.existsSync(file)) return;
    const cfg = JSON.parse(fs.readFileSync(file, 'utf8'));
    const out = cfg.output || path.join(require('os').homedir(), 'Downloads');
    const fmt = cfg.format === 'long' ? 'long format 16:9 1920x1080 60 fps (beat sync optional)' : 'short beat-synced loop 1440x1440 60 fps';
    const ctx = [
      'CLAUDEMOTION VIDEO SESSION (this folder has claudemotion.json).',
      `Defaults: style "${cfg.style || 'standard'}", ${fmt}, deliver finished MP4s to ${out}.`,
      'For any video request use the claudemotion skill and its workflow: setup check, then ask the open questions with AskUserQuestion,',
      'pick a fresh concept (references/structures.md + scripts/history.py show: never repeat the opener or story shape of the last two videos),',
      'analyze the song, show the state/scene plan on the beat grid or timeline, and write no code before the user agreed.',
      'Pages use the engine in ./engine (pure seek(t), closed-form springs, one morphing shape). Review contact sheets before the full render,',
      'run loopcheck for loops, then render, mix and mux. Report every placeholder you invented.',
    ].join(' ');
    process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: ctx } }));
  } catch (_) { /* fail open */ }
});
