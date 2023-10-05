#!/usr/bin/env zx

const BAN_THRESHOLD = 100;
const CHECK_INTERVAL_HOURS = 12;

const from = new Date();
from.setHours(from.getHours() - CHECK_INTERVAL_HOURS);

const logsResponse = await fetch(
  'https://logs.betterstack.com/api/v1/query?' +
    new URLSearchParams({
      from: from.toISOString(),
      to: new Date().toISOString(),
      batch: 1000,
    }),
  {
    headers: {
      Authorization: 'Bearer ' + process.env.LOGS_API_TOKEN,
    },
  }
);

const logsBody = await logsResponse.json();

const ipMap = {};
for (const log of logsBody.data) {
  const rawIP = log['metadata.request.headers.x_real_ip'];
  const ip = rawIP.includes(':') ? rawIP.split(':').slice(0, 4).join(':') + '::/64' : rawIP;
  ipMap[ip] = (ipMap[ip] || 0) + 1;
}

const bans = Object.entries(ipMap)
  .filter(([, count]) => count >= BAN_THRESHOLD)
  .map(([ip, count]) => ({
    comment: `${count} requests / ${CHECK_INTERVAL_HOURS} hours`,
    ip,
  }));

if (bans.length === 0) {
  console.info('No IP to ban');
  process.exit(0);
}

console.info(`Found ${bans.length} IP(s) to ban`);

const cloudflareURL = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT}/rules/lists/${process.env.BLACKLIST_ID}/items`;
const banResponse = await fetch(cloudflareURL, {
  method: 'POST',
  body: JSON.stringify(bans),
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + process.env.CLOUDFLARE_TOKEN },
});

console.info('Ban result:');
console.info(await banResponse.json());
