import { readFileSync } from 'node:fs';
import { isIP } from 'node:net';

const {
  CLOUDFLARE_ACCOUNT,
  CLOUDFLARE_ZONE_ID,
  CLOUDFLARE_TOKEN,
  BLACKLIST_ID,
  GITHUB_TOKEN,
  GITHUB_REPOSITORY,
  GITHUB_EVENT_PATH,
  ISSUE_NUMBER,
} = process.env;

// Local testing: DRY_RUN=1 prints the comment instead of posting it
const DRY_RUN = process.env.DRY_RUN === '1';

// The issue text is untrusted: cap the number of Cloudflare lookups it can trigger
const MAX_RAY_IDS = 5;
// Security events are only kept for a limited time (depends on the Cloudflare plan)
const LOOKBACK_DAYS = 7;
const TIME_ZONE = 'Europe/Paris';

const PAGE_URL = 'https://conso.boris.sh/blocage-ip';
const PAGE_MIRROR_URL = 'https://github.com/bokub/conso-api/blob/master/content/blocage-ip.md';

const banDateDisplay = new Intl.DateTimeFormat('fr-FR', {
  timeZone: TIME_ZONE,
  dateStyle: 'long',
});

// Same function as in ipban.mjs
function anonymize(ip) {
  if (ip.includes(':')) {
    const ipv4Tail = ip.match(/(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    const address = ipv4Tail
      ? ip.replace(
          /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
          `${((Number(ipv4Tail[1]) << 8) | Number(ipv4Tail[2])).toString(16)}:${(
            (Number(ipv4Tail[3]) << 8) |
            Number(ipv4Tail[4])
          ).toString(16)}`
        )
      : ip;
    const [left, right = ''] = address.split('::');
    const leftParts = left ? left.split(':') : [];
    const rightParts = right ? right.split(':') : [];
    const missingParts = 8 - leftParts.length - rightParts.length;
    const parts = address.includes('::')
      ? [...leftParts, ...Array(missingParts).fill('0'), ...rightParts]
      : address.split(':');

    return parts.map((part, index) => (index >= 2 && index < 6 ? '••••' : part)).join(':');
  }

  const parts = ip.split('.');
  return `${parts[0]}.•••.•••.${parts.at(-1)}`;
}

function normalizeIP(ip) {
  if (ip.includes(':')) {
    try {
      return new URL(`http://[${ip}]`).hostname;
    } catch {
      return ip.toLowerCase();
    }
  }
  return ip;
}

function extractRayIds(text) {
  // A Ray ID is 16 hex characters. Pure-digit strings are ignored to limit false positives.
  const matches = (text.match(/\b[0-9a-f]{16}\b/gi) ?? []).filter((id) => /[a-f]/i.test(id));
  return [...new Set(matches.map((id) => id.toLowerCase()))].slice(0, MAX_RAY_IDS);
}

async function findIPsByRayId(rayId) {
  const query = `query GetRayEvents(
  $zoneTag: string
  $filter: FirewallEventsAdaptiveFilter_InputObject
) {
  viewer {
    zones(filter: { zoneTag: $zoneTag }) {
      events: firewallEventsAdaptive(
        filter: $filter,
        limit: 100,
        orderBy: [datetime_DESC]
      ) {
        clientIP
      }
    }
  }
}`;

  const dayMs = 24 * 60 * 60 * 1000;
  const now = Date.now();

  // One query per 24h window, from the most recent one, to stay within Cloudflare's query time range limits
  for (let day = 0; day < LOOKBACK_DAYS; day += 1) {
    const to = new Date(now - day * dayMs);
    const from = new Date(to.getTime() - dayMs);

    let events;
    try {
      const response = await fetch('https://api.cloudflare.com/client/v4/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${CLOUDFLARE_TOKEN}` },
        body: JSON.stringify({
          query,
          variables: {
            zoneTag: CLOUDFLARE_ZONE_ID,
            filter: { rayName: rayId, datetime_geq: from.toISOString(), datetime_lt: to.toISOString() },
          },
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}, body: ${await response.text()}`);
      }
      const result = await response.json();
      if (result.errors?.length) {
        throw new Error(`Cloudflare GraphQL error: ${JSON.stringify(result.errors)}`);
      }
      events = result.data?.viewer?.zones?.[0]?.events;
      if (!events) {
        throw new Error('Cloudflare GraphQL response did not contain zone events');
      }
    } catch (error) {
      // Older windows can fail because they are out of the retention period: only the first one is fatal
      if (day === 0) throw error;
      console.warn(`Stopped looking back at day ${day + 1}: ${error.message}`);
      break;
    }

    const ips = [...new Set(events.map(({ clientIP }) => clientIP))].filter((ip) => typeof ip === 'string' && isIP(ip));
    if (ips.length > 0) return ips;
  }

  return [];
}

async function findBan(ip) {
  const url = new URL(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT}/rules/lists/${BLACKLIST_ID}/items`
  );
  url.searchParams.set('search', ip);
  url.searchParams.set('per_page', '100');

  const response = await fetch(url, { headers: { Authorization: `Bearer ${CLOUDFLARE_TOKEN}` } });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}, body: ${await response.text()}`);
  }
  const { result } = await response.json();
  const target = normalizeIP(ip);
  return (result ?? []).find((item) => item.ip && normalizeIP(item.ip.replace(/\/(32|128)$/, '')) === target) ?? null;
}

// "138 requests / 12 hours" -> "138 requêtes à l'API sur un intervalle de 12h"
function formatReason(comment) {
  const match = comment?.match(/^(\d+) requests? \/ (\d+) hours?$/);
  return match ? `${match[1]} requêtes à l'API sur un intervalle de ${match[2]}h` : null;
}

function formatFinding({ ip, ban, rayIds }, title) {
  const reason = formatReason(ban.comment);
  const lines = [
    ...(title ? [`**${title}**`, ''] : []),
    `- **Ray ID** : ${rayIds.map((id) => `\`${id}\``).join(', ')}`,
    `- **IP** : \`${anonymize(ip)}\``,
    ...(ban.created_on ? [`- **Date du blocage** : ${banDateDisplay.format(new Date(ban.created_on))}`] : []),
    ...(reason ? [`- **Raison** : ${reason}`] : []),
  ];
  return lines.join('\n');
}

function buildComment(findings) {
  const invitation =
    `Merci de lire [cette page](${PAGE_URL}) (ou [celle-ci](${PAGE_MIRROR_URL}) si la première est bloquée) : ` +
    `elle explique pourquoi une IP est bloquée, comment éviter un blocage, et pourquoi aucun déblocage manuel n'est effectué.`;

  if (findings.length === 0) {
    return `Bonjour 👋\n\nSi vous avez une erreur 403 « Sorry, you have been blocked », votre adresse IP est probablement bloquée. ${invitation}`;
  }

  const blocks = findings.map((finding, index) =>
    formatFinding(finding, findings.length > 1 ? `Blocage ${index + 1}` : undefined)
  );
  return `Bonjour 👋\n\nVoici ce que j'ai pu identifier concernant votre blocage :\n\n${blocks.join(
    '\n\n'
  )}\n\n${invitation}`;
}

async function postComment(issueNumber, body) {
  const response = await fetch(`https://api.github.com/repos/${GITHUB_REPOSITORY}/issues/${issueNumber}/comments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'ipban-issue',
    },
    body: JSON.stringify({ body }),
  });
  if (!response.ok) {
    throw new Error(`Could not post comment! status: ${response.status}, body: ${await response.text()}`);
  }
}

// ---

function githubHeaders() {
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'ipban-issue',
    ...(GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {}),
  };
}

async function loadComments(issueNumber) {
  const comments = [];
  for (let page = 1; page <= 10; page += 1) {
    const url = `https://api.github.com/repos/${GITHUB_REPOSITORY}/issues/${issueNumber}/comments?per_page=100&page=${page}`;
    const response = await fetch(url, { headers: githubHeaders() });
    if (!response.ok) {
      throw new Error(`Could not read comments! status: ${response.status}, body: ${await response.text()}`);
    }
    const batch = await response.json();
    comments.push(...batch);
    if (batch.length < 100) break;
  }
  return comments;
}

async function loadIssue() {
  if (GITHUB_EVENT_PATH) {
    return JSON.parse(readFileSync(GITHUB_EVENT_PATH, 'utf8')).issue;
  }

  // Local testing: read a real issue (public repository, the token is optional and only avoids rate limits)
  if (ISSUE_NUMBER && GITHUB_REPOSITORY) {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPOSITORY}/issues/${ISSUE_NUMBER}`, {
      headers: githubHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Could not read issue! status: ${response.status}, body: ${await response.text()}`);
    }
    return response.json();
  }

  throw new Error('Missing GITHUB_EVENT_PATH (or ISSUE_NUMBER and GITHUB_REPOSITORY)');
}

if (!DRY_RUN && (!GITHUB_TOKEN || !GITHUB_REPOSITORY)) {
  throw new Error('Missing required GitHub environment variables');
}

const issue = await loadIssue();
let failed = false;

// Comments from bots (including this workflow's own replies) are ignored
let commentBodies = [];
if (GITHUB_REPOSITORY) {
  try {
    const comments = await loadComments(issue.number);
    commentBodies = comments.filter(({ user }) => user?.type !== 'Bot').map(({ body }) => body ?? '');
  } catch (error) {
    // Do not stop here: the initial message can still be analyzed
    failed = true;
    console.error(error.message);
  }
}

const rayIds = extractRayIds([issue.title, issue.body, ...commentBodies].map((text) => text ?? '').join('\n'));
console.info(`Issue #${issue.number}: ${commentBodies.length} comment(s), ${rayIds.length} Ray ID(s) found`);

const findings = new Map();

for (const rayId of rayIds) {
  try {
    if (!CLOUDFLARE_ACCOUNT || !CLOUDFLARE_ZONE_ID || !CLOUDFLARE_TOKEN || !BLACKLIST_ID) {
      throw new Error('Missing required Cloudflare environment variables');
    }

    const ips = await findIPsByRayId(rayId);
    if (ips.length === 0) {
      console.info(`Ray ID ${rayId}: no IP found, skipping`);
      continue;
    }

    for (const ip of ips) {
      try {
        const ban = await findBan(ip);
        if (!ban) {
          console.info(`Ray ID ${rayId}: ${anonymize(ip)} is not in the list, skipping`);
          continue;
        }

        console.info(`Ray ID ${rayId}: ${anonymize(ip)} - ${ban.comment}`);
        const finding = findings.get(ip) ?? { ip, ban, rayIds: [] };
        finding.rayIds.push(rayId);
        findings.set(ip, finding);
      } catch (error) {
        // One failing IP must not hide the others
        failed = true;
        console.error(`Ray ID ${rayId}, ${anonymize(ip)}: ${error.message}`);
      }
    }
  } catch (error) {
    // Do not stop here: the invitation to read the page is still useful
    failed = true;
    console.error(`Ray ID ${rayId}: ${error.message}`);
  }
}

const comment = buildComment([...findings.values()]);
if (DRY_RUN) {
  console.info(`\n--- DRY RUN: comment not posted ---\n\n${comment}`);
} else {
  await postComment(issue.number, comment);
  console.info('Comment posted');
}

if (failed) process.exitCode = 1;
