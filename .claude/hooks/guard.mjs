#!/usr/bin/env node
// PreToolUse guard for Edit|Write|MultiEdit.
// - Blocks (exit 2) content that looks like a secret.
// - Warns (additionalContext) when a migration creates a table without RLS.
// Cross-platform: reads hook JSON from stdin, no dependencies.
import { readFileSync } from 'node:fs';

let input = {};
try {
  input = JSON.parse(readFileSync(0, 'utf8') || '{}');
} catch {
  process.exit(0); // never break the session on malformed input
}

const ti = input.tool_input ?? {};
const filePath = String(ti.file_path ?? '').split('\\').join('/');
const chunks = [];
if (typeof ti.content === 'string') chunks.push(ti.content);
if (typeof ti.new_string === 'string') chunks.push(ti.new_string);
if (Array.isArray(ti.edits)) for (const e of ti.edits) if (typeof e?.new_string === 'string') chunks.push(e.new_string);
const text = chunks.join('\n');
if (!text) process.exit(0);

// Files where example/placeholder secrets are legitimate.
const allowlisted =
  /(\.env\.example$|\.md$|\.claude\/hooks\/guard\.mjs$|\/fixtures\/|\.test\.|\.spec\.)/i.test(filePath);

const rules = [
  { name: 'Private key block', re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/ },
  { name: 'Live secret key (sk_live)', re: /\bsk_live_[0-9A-Za-z]{10,}/ },
  { name: 'AWS access key id', re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
  { name: 'AWS secret access key', re: /aws_?secret_?access_?key["'\s:=]+[A-Za-z0-9/+=]{40}/i },
  { name: 'Daraja consumer key/secret', re: /(?:consumer[_-]?(?:key|secret)|MPESA_CONSUMER_(?:KEY|SECRET))["'\s:=]+[A-Za-z0-9]{32,64}\b/i },
  { name: 'Daraja passkey', re: /(?:pass[_-]?key|MPESA_PASSKEY)["'\s:=]+[A-Fa-f0-9]{48,70}\b/i },
  { name: 'Generic API key/secret/token literal', re: /(?:api[_-]?key|secret|token)["']?\s*[:=]\s*["'][A-Za-z0-9_-]{32,}["']/i },
];

if (!allowlisted) {
  const hits = rules.filter((r) => r.re.test(text)).map((r) => r.name);
  if (hits.length) {
    process.stderr.write(
      `BLOCKED by guard.mjs: content for ${filePath} appears to contain a secret (${hits.join(', ')}). ` +
        `Use env vars validated in packages/config/env.ts and add placeholders to .env.example only.\n`,
    );
    process.exit(2);
  }
}

// Migration RLS warning.
if (/(^|\/)(drizzle|migrations?)\/.*\.sql$/i.test(filePath)) {
  const created = [
    ...text.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"?public"?\.)?"?([a-z_0-9]+)"?/gi),
  ].map((m) => m[1]);
  const missing = created.filter(
    (t) =>
      !new RegExp(
        `ALTER\\s+TABLE\\s+(?:"?public"?\\.)?"?${t}"?\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`,
        'i',
      ).test(text),
  );
  if (missing.length) {
    const msg =
      `WARNING: migration creates table(s) [${missing.join(', ')}] without ENABLE ROW LEVEL SECURITY ` +
      `in the same file. CLAUDE.md rule 9: add RLS + policies (see drizzle-rls skill) unless the table is global/non-tenant.`;
    process.stderr.write(msg + '\n');
    process.stdout.write(
      JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: msg } }),
    );
  }
}
process.exit(0);
