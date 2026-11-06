import { cronJobs } from 'convex/server';

import { internal } from './_generated/api';

const crons = cronJobs();

crons.daily(
  'forget tombstones past their retention',
  { hourUTC: 3, minuteUTC: 0 },
  internal.sync.purgeExpiredTombstones,
);

crons.daily(
  'forget expired diagnostic samples',
  { hourUTC: 3, minuteUTC: 17 },
  internal.diagnosticSamples.purgeExpired,
);

crons.daily(
  'remove RevenueCat customers that a device recreated after a recent deletion',
  { hourUTC: 3, minuteUTC: 34 },
  internal.account.sweepRevenueCatCustomers,
  { scope: 'recent' },
);

crons.monthly(
  'remove RevenueCat customers that a device recreated after any deletion',
  { day: 1, hourUTC: 4, minuteUTC: 12 },
  internal.account.sweepRevenueCatCustomers,
  { scope: 'all' },
);

export default crons;
