function toTableRows(users) {
  return users.map(u => ({
    id: u.id ?? u.user_id ?? u.uuid ?? '',
    email: u.email ?? '',
    name: u.name ?? u.full_name ?? `${u.first_name || ''} ${u.last_name || ''}`.trim(),
    region: u.region ?? u.location ?? '',
    status: u.status ?? u.enabled ?? u.active ?? '',
  }));
}

function printTable(users) {
  const rows = toTableRows(users);
  if (rows.length === 0) {
    console.log('No users found.');
    return;
  }
  // Simple console table without external deps
  const headers = ['ID', 'Email', 'Name', 'Region', 'Status'];
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map(r => String(Object.values(r)[i]).length)));
  const pad = (str, w) => String(str).padEnd(w, ' ');
  const line = (sep = ' ') => widths.map((w) => '-'.repeat(w)).join(sep);
  console.log(headers.map((h, i) => pad(h, widths[i])).join('  '));
  console.log(line('  '));
  for (const r of rows) {
    const vals = Object.values(r).map((v, i) => pad(v == null ? '' : v, widths[i]));
    console.log(vals.join('  '));
  }
}

function printJson(users) {
  console.log(JSON.stringify(users, null, 2));
}

module.exports = { printTable, printJson };
