#!/usr/bin/env zx
$.verbose = false;

const BAN_THRESHOLD = 100;
const CHECK_INTERVAL_HOURS = 12;

const {
  LOGS_API_USER,
  LOGS_API_PASSWORD,
  LOGS_API_TEAM,
  LOGS_API_SOURCE,
  CLOUDFLARE_ACCOUNT,
  BLACKLIST_ID,
  CLOUDFLARE_TOKEN,
} = process.env;

let to = new Date();
to.setHours(to.getHours() < 12 ? 0 : 12, 0, 0, 0);

const from = new Date(to);
from.setHours(to.getHours() - CHECK_INTERVAL_HOURS);

console.info(`Checking server logs from ${from.toISOString()} to ${to.toISOString()}...`);

function anonymize(ip) {
  const separator = ip.includes(':') ? ':' : '.';
  const parts = ip.split(separator);
  return [parts[0], parts[1].replace(/./g, '•'), parts[2].replace(/./g, '•'), parts[3]].join(separator);
}

async function queryLogsByIP(startDate, endDate) {
  // Validate required environment variables
  if (!LOGS_API_USER || !LOGS_API_PASSWORD || !LOGS_API_TEAM || !LOGS_API_SOURCE) {
    throw new Error('Missing required environment variables');
  }

  // Build WHERE clause for date filtering
  const whereClause = `toDate(dt) >= '${startDate.toISOString().split('T')[0]}'
     AND toDate(dt) <= '${endDate.toISOString().split('T')[0]}' 
     AND getJSON(raw, 'metadata.request.headers.cf_connecting_ip') IS NOT NULL`;

  // Build the SQL query
  const sqlQuery = `SELECT 
    getJSON(raw, 'metadata.request.headers.cf_connecting_ip') as ip,
    count(*) as count
FROM (
    SELECT dt, raw 
    FROM remote(${LOGS_API_TEAM}_${LOGS_API_SOURCE}_logs)
    UNION ALL
    SELECT dt, raw 
    FROM s3Cluster(primary, ${LOGS_API_TEAM}_${LOGS_API_SOURCE}_s3)
)
WHERE ${whereClause}
GROUP BY ip
ORDER BY count DESC
FORMAT JSONEachRow`;

  // Make the HTTP request
  const response = await fetch('https://eu-nbg-2-connect.betterstackdata.com', {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
      Authorization: 'Basic ' + Buffer.from(`${LOGS_API_USER}:${LOGS_API_PASSWORD}`).toString('base64'),
    },
    body: sqlQuery,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status}, statusText: ${response.statusText}, body: ${errorText}`);
  }
  const responseText = await response.text();
  return responseText.trim().split('\n').map(JSON.parse);
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
