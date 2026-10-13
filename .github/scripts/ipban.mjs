#!/usr/bin/env zx
import { isIP } from 'node:net';

$.verbose = false;

const BAN_THRESHOLD = 100;
const CHECK_INTERVAL_HOURS = 12;

const { CLOUDFLARE_ACCOUNT, BLACKLIST_ID, CLOUDFLARE_TOKEN } = process.env;

const TIME_ZONE = 'Europe/Paris';
const parisDateTime = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  hourCycle: 'h23',
});
const parisDateTimeDisplay = new Intl.DateTimeFormat('fr-FR', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
  timeZoneName: 'short',
});

function getParisParts(date) {
  return Object.fromEntries(parisDateTime.formatToParts(date).map(({ type, value }) => [type, value]));
}

function getParisBoundary(year, month, day, hour) {
  const targetTime = Date.UTC(year, month - 1, day, hour);
  let timestamp = targetTime;

  // Correct the UTC guess until it represents the requested Paris wall-clock time.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = getParisParts(new Date(timestamp));
    const representedTime = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour)
    );
    timestamp += targetTime - representedTime;
  }

  return new Date(timestamp);
}

const nowInParis = getParisParts(new Date());
const todayHour = Number(nowInParis.hour) < 12 ? 0 : 12;
const to = getParisBoundary(Number(nowInParis.year), Number(nowInParis.month), Number(nowInParis.day), todayHour);

const previousBoundaryDate = new Date(
  Date.UTC(Number(nowInParis.year), Number(nowInParis.month) - 1, Number(nowInParis.day) - (todayHour === 0 ? 1 : 0))
);
const from = getParisBoundary(
  previousBoundaryDate.getUTCFullYear(),
  previousBoundaryDate.getUTCMonth() + 1,
  previousBoundaryDate.getUTCDate(),
  todayHour === 0 ? 12 : 0
);

console.info(
  `Checking server logs from ${parisDateTimeDisplay.format(from)} (${from.toISOString()}) ` +
    `to ${parisDateTimeDisplay.format(to)} (${to.toISOString()})`
);

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

async function queryLogsByIP(startDate, endDate) {
  if (!CLOUDFLARE_ACCOUNT || !CLOUDFLARE_TOKEN) {
    throw new Error('Missing required Cloudflare environment variables');
  }

  const query = `query GetCustomTopN(
  $accountTag: string
  $filter: AccountHttpRequestsAdaptiveGroupsFilter_InputObject
  $limit: uint64
) {
  viewer {
    scope: accounts(filter: { accountTag: $accountTag }) {
      topN: httpRequestsAdaptiveGroups(
        filter: $filter,
        limit: $limit,
        orderBy: [count_DESC]
      ) {
        count
        dimensions {
          metric_0: clientIP
        }
      }
    }
  }
}`;

  const response = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CLOUDFLARE_TOKEN}`,
    },
    body: JSON.stringify({
      query,
      variables: {
        accountTag: CLOUDFLARE_ACCOUNT,
        limit: 10000,
        filter: {
          datetime_geq: startDate.toISOString(),
          datetime_lt: endDate.toISOString(),
          AND: [
            { clientRequestPath_like: '/api/%' },
            { clientRequestHTTPHost: 'conso.boris.sh' },
            { cacheStatus: 'dynamic' },
            { requestSource: 'eyeball' },
          ],
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status}, statusText: ${response.statusText}, body: ${errorText}`);
  }

  const result = await response.json();
  if (result.errors?.length) {
    throw new Error(`Cloudflare GraphQL error: ${JSON.stringify(result.errors)}`);
  }

  const account = result.data?.viewer?.scope?.[0];
  const groups = account?.topN;
  if (!account || !groups) {
    throw new Error('Cloudflare GraphQL response did not contain account request groups');
  }

  return groups.map(({ count, dimensions }) => {
    const ip = dimensions?.metric_0;
    const requestCount = Number(count);
    if (typeof ip !== 'string' || isIP(ip) === 0 || !Number.isFinite(requestCount)) {
      throw new Error('Cloudflare GraphQL response contained an invalid request group');
    }
    return { ip, count: requestCount };
  });
}

const logs = await queryLogsByIP(from, to);

const bans = logs
  .filter(({ count }) => count >= BAN_THRESHOLD)
  .map(({ ip, count }) => ({ comment: `${count} requests / ${CHECK_INTERVAL_HOURS} hours`, ip }));

if (bans.length === 0) {
  console.info('No IP to ban');
  process.exit(0);
}

console.info(`\nFound ${bans.length} IP(s) to ban:`);
for (const ban of bans) {
  console.info(`${anonymize(ban.ip)} - ${ban.comment}`);
}

const cloudflareURL = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT}/rules/lists/${BLACKLIST_ID}/items`;
const banResponse = await fetch(cloudflareURL, {
  method: 'POST',
  body: JSON.stringify(bans),
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + CLOUDFLARE_TOKEN },
});

if (banResponse.status !== 200) {
  console.error('\nBan error:');
  console.error(await banResponse.json());
  process.exit(1);
}

console.info('\nBan successful!');
