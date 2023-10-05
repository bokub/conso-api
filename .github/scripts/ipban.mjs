#!/usr/bin/env zx
$.verbose = false;

const BAN_THRESHOLD = 100;
const CHECK_INTERVAL_HOURS = 12;

const from = new Date();
from.setHours(from.getHours() - CHECK_INTERVAL_HOURS);

function anonymize(ip) {
  const separator = ip.includes(':') ? ':' : '.';
  const parts = ip.split(separator);
  return [parts[0], parts[1].replace(/./g, '•'), parts[2].replace(/./g, '•'), parts[3]].join(separator);
}

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
).catch((e) => {
  console.error(e);
  process.exit(1);
});

const logsBody = await logsResponse.json();

console.info(`Processing ${logsBody.data.length} logs...`);

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

console.info(`\nFound ${bans.length} IP(s) to ban:`);
for (const ban of bans) {
  console.info(`${anonymize(ban.ip)} - ${ban.comment}`);
}

const cloudflareURL = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT}/rules/lists/${process.env.BLACKLIST_ID}/items`;
const banResponse = await fetch(cloudflareURL, {
  method: 'POST',
  body: JSON.stringify(bans),
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + process.env.CLOUDFLARE_TOKEN },
});

if (banResponse.status !== 200) {
  console.error('\nBan error:');
  console.error(await banResponse.json());
  process.exit(1);
}

console.info('\nBan successful!');
