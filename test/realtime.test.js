// -----------------------------------------------------------------------------
// The operator's real-time client: departures, the shared feed cache, the
// stop table mapping, the refusals.
// -----------------------------------------------------------------------------

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConfig } from '../src/config.js';
import {
  clearRealtimeCache,
  departuresFromFeed,
  fetchDepartures,
  getTripUpdates,
  realtimeErrorFor,
  RealtimeApiError,
  redact,
  setPolledStops,
  STALE_FEED_MAX_MS,
} from '../src/api/realtime.js';
import { GtfsRealtimeDecodeError } from '../src/api/gtfsRealtime.js';
import { NETWORK } from '../src/network.js';
import { encodeFeed } from './helpers/gtfsRealtimeEncoder.js';
import { restoreFetch, stubFetch } from './helpers/stubFetch.js';

const NOW_MS = 1_760_100_000_000;
const NOW = NOW_MS / 1000;
const FEED = new URL(NETWORK.realtime.tripUpdatesUrl).pathname;

// 5299 is NB 1 ST SW @ 8 AV SW, served by the 22 and the 66; 6831 the
// eastbound CTrain platform of City Hall. The feed names the routes by their
// short names ("201" is the Red Line). No key: the feeds are open.
const config = normalizeConfig({ stops: '5299, 5299@66, 6831' });

function feed() {
  return encodeFeed({
    timestamp: NOW,
    entities: [
      {
        tripUpdate: {
          trip: { tripId: 'late', routeId: '22' },
          stopTimeUpdates: [{ stopId: '5299', departure: { time: NOW + 600, delay: 400 } }],
        },
      },
      {
        tripUpdate: {
          trip: { tripId: 'soon', routeId: '66' },
          stopTimeUpdates: [
            { stopId: '5299', arrival: { time: NOW + 125 } },
            { stopId: '99999', arrival: { time: NOW + 300 } },
          ],
        },
      },
      {
        tripUpdate: {
          trip: { tripId: 'ctrain', routeId: '201' },
          stopTimeUpdates: [{ stopId: '6831', arrival: { time: NOW + 60 } }],
        },
      },
      {
        tripUpdate: {
          trip: { tripId: 'cancelled', routeId: '22', scheduleRelationship: 3 },
          stopTimeUpdates: [{ stopId: '5299', arrival: { time: NOW + 200 } }],
        },
      },
      {
        tripUpdate: {
          trip: { tripId: 'skips', routeId: '22' },
          stopTimeUpdates: [
            { stopId: '5299', scheduleRelationship: 1, arrival: { time: NOW + 90 } },
          ],
        },
      },
      {
        tripUpdate: {
          trip: { tripId: 'gone', routeId: '22' },
          stopTimeUpdates: [{ stopId: '5299', arrival: { time: NOW - 120 } }],
        },
      },
    ],
  });
}

beforeEach(() => clearRealtimeCache());
afterEach(() => restoreFetch());

test('departures are mapped from stop codes, named, sorted and filtered', async () => {
  stubFetch({ [FEED]: feed() });
  const [stop, stopRoute66, platform] = config.watched.stops;

  const board = await fetchDepartures(config, stop, { now: NOW_MS });
  assert.deepEqual(
    board.map((departure) => [departure.tripId, departure.route, departure.minutes]),
    [
      ['soon', '66', 2],
      ['late', '22', 10],
    ],
  );
  assert.equal(board[1].delaySeconds, 400);
  assert.equal(board[0].realtime, true);

  // The route filter keeps the 66 and drops the 22 calling at the same stop.
  const filtered = await fetchDepartures(config, stopRoute66, { now: NOW_MS });
  assert.deepEqual(
    filtered.map((departure) => departure.tripId),
    ['soon'],
  );

  // The CTrain is in the same feed.
  const train = await fetchDepartures(config, platform, { now: NOW_MS });
  assert.deepEqual(
    train.map((departure) => [departure.route, departure.minutes]),
    [['201', 1]],
  );
});

test('one read of the open feed serves every stop', async () => {
  const calls = stubFetch({ [FEED]: feed() });
  for (const stop of config.watched.stops) {
    await fetchDepartures(config, stop, { now: NOW_MS });
  }
  await fetchDepartures(config, config.watched.stops[0], { now: NOW_MS + 30_000 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, NETWORK.realtime.tripUpdatesUrl);
  assert.match(calls[0].headers['User-Agent'], /^gladys-calgary-transit\//);

  // A new interval reads again; so does a forced fresh read.
  await fetchDepartures(config, config.watched.stops[0], { now: NOW_MS + 60_000 });
  await getTripUpdates(config, { now: NOW_MS + 61_000, fresh: true });
  assert.equal(calls.length, 3);
});

test('a stop the configuration does not list (a suggestion) is decoded too', async () => {
  stubFetch({ [FEED]: feed() });
  const typedNothing = normalizeConfig();
  const suggested = { id: '5299', routes: [], name: null };
  setPolledStops([suggested]);
  const board = await fetchDepartures(typedNothing, suggested, { now: NOW_MS });
  assert.equal(board.length, 2);
});

test('a departure just past its time stays on the board for a few seconds', () => {
  const board = departuresFromFeed(
    {
      stopTimes: [
        {
          stopId: '5299',
          routeId: '22',
          tripScheduleRelationship: 0,
          scheduleRelationship: 0,
          arrival: { time: NOW - 20 },
        },
      ],
    },
    { id: '5299', routes: [] },
    NOW,
  );
  assert.equal(board[0].minutes, 0);
});

test('a feed served cut short or empty: the last good read stands in a while', async () => {
  const whole = feed();
  let served = whole;
  stubFetch({ [FEED]: () => served });
  const [stop] = config.watched.stops;
  assert.equal((await fetchDepartures(config, stop, { now: NOW_MS })).length, 2);

  // The portal serves the file cut short, then empty, while rewriting it.
  served = { status: 200, body: whole.subarray(0, 40) };
  assert.equal((await fetchDepartures(config, stop, { now: NOW_MS + 60_000 })).length, 2);
  served = new Uint8Array(0);
  assert.equal((await fetchDepartures(config, stop, { now: NOW_MS + 120_000 })).length, 2);

  // Too old to stand in: the failure shows.
  await assert.rejects(
    fetchDepartures(config, stop, { now: NOW_MS + STALE_FEED_MAX_MS + 1000 }),
    GtfsRealtimeDecodeError,
  );
  // Without a good read before, it shows at once.
  clearRealtimeCache();
  await assert.rejects(fetchDepartures(config, stop, { now: NOW_MS }), GtfsRealtimeDecodeError);
});

test('a trip Transitous has not listed gets the only direction of its route', () => {
  const board = departuresFromFeed(
    {
      stopTimes: [
        {
          stopId: '6831',
          routeId: '201',
          tripId: 'unlisted',
          tripScheduleRelationship: 0,
          scheduleRelationship: 0,
          arrival: { time: NOW + 120 },
        },
      ],
    },
    { id: '6831', routes: [] },
    NOW,
  );
  // Nothing described yet: no direction rather than a wrong one.
  assert.equal(board[0].headsign, '');
});

test('an open feed failing is not about a key', async () => {
  stubFetch({ [FEED]: { status: 403, body: 'Forbidden: key' } });
  await assert.rejects(fetchDepartures(config, config.watched.stops[0], { now: NOW_MS }), (err) => {
    assert.equal(err.status, 403);
    assert.equal(err.userMessage, undefined);
    return true;
  });
  assert.equal(realtimeErrorFor(503, 'Service Unavailable', 'x').userMessage, undefined);
});

test('a network error is reported, and a key would be redacted', async () => {
  globalThis.fetch = async (url, options) => {
    throw new Error(`connect ECONNREFUSED ${url} ${JSON.stringify(options.headers)}`);
  };
  await assert.rejects(
    fetchDepartures(config, config.watched.stops[0], { now: NOW_MS }),
    (err) => err instanceof RealtimeApiError && /unreachable/.test(err.message),
  );
  assert.equal(redact('a k3y b k3y', 'k3y'), 'a *** b ***');
  assert.equal(redact('text', ''), 'text');
});
