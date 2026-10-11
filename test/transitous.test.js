// -----------------------------------------------------------------------------
// Transitous client: departures of a stop code, route labels, descriptions.
// -----------------------------------------------------------------------------

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  clearTransitousCache,
  describeStop,
  formatRoutes,
  gtfsId,
  knownStop,
  scheduledDepartures,
  stopTimes,
  tidyHeadsign,
  TransitousError,
} from '../src/api/transitous.js';
import { distanceMeters } from '../src/api/stops.js';
import { stopTimesPayload } from './helpers/fixtures.js';
import { restoreFetch, stubFetch } from './helpers/stubFetch.js';

const HOME = { lat: 51.0463, lon: -114.0569 };
const NOW = Date.UTC(2026, 9, 11, 16, 0, 0);

beforeEach(() => clearTransitousCache());
afterEach(() => restoreFetch());

test('Transitous ids give back the GTFS ids', () => {
  assert.equal(gtfsId('ca-Calgary-Transit_6831'), '6831');
  assert.equal(gtfsId('20261011_08:32_ca-Calgary-Transit_76051039'), '76051039');
  assert.equal(gtfsId(undefined), '');
});

test('a stop code is asked by its GTFS id, with a User-Agent', async () => {
  const calls = stubFetch({ '/v5/stoptimes': stopTimesPayload(NOW, [{ minutes: 3 }]) });
  await stopTimes('5299');
  assert.match(calls[0].url, /stopId=ca-Calgary-Transit_5299&n=10/);
  assert.match(calls[0].headers['User-Agent'], /^gladys-calgary-transit\/.*github\.com/);
  // A CTrain platform is asked for itself.
  await stopTimes('6831');
  assert.match(calls[1].url, /stopId=ca-Calgary-Transit_6831&n=10/);
  await assert.rejects(stopTimes('00000'), TransitousError);
});

test('the departures: route labels from the table, other bays and termini dropped', async () => {
  stubFetch({
    '/v5/stoptimes': stopTimesPayload(NOW, [
      { minutes: 3 },
      { minutes: 7, routeId: '66-20795', shortName: '66', headsign: 'LAKEVIEW', delayMinutes: 2 },
      // Transitous may answer for a group of stops: the other side of the
      // street is another sign.
      { minutes: 8, stopId: '5833' },
      { minutes: 9, cancelled: true },
      { minutes: 10, pickupType: 'NOT_ALLOWED' },
      // A route the table does not know: the short name, without its zeros.
      {
        minutes: 11,
        routeId: 'new',
        shortName: '0R5',
        headsign: 'Mount Royal U',
        realTime: true,
      },
    ]),
  });
  const departures = await stopTimes('5299');
  assert.deepEqual(
    departures.map(({ route, headsign, delaySeconds, realtime }) => [
      route,
      headsign,
      delaySeconds,
      realtime,
    ]),
    [
      ['22', 'Richmond Rd SW', 0, false],
      ['66', 'Lakeview', 120, false],
      ['R5', 'Mount Royal U', 0, true],
    ],
  );
});

test('headsigns lose the route they repeat', () => {
  assert.equal(tidyHeadsign('3 Main/To Marine Dr Station', '3'), 'Main/To Marine Dr Station');
  assert.equal(tidyHeadsign('Canada Line To YVR-Airport', 'Canada Line'), 'YVR-Airport');
  assert.equal(tidyHeadsign('Mount Royal U', '99'), 'Mount Royal U');
  assert.equal(tidyHeadsign('99', '99'), '99');
  assert.equal(tidyHeadsign('Hospital ~ Hôpital', '45'), 'Hospital / Hôpital');
  assert.equal(tidyHeadsign('East - 114 Queens Quay East towards Carlaw', '114'), 'Carlaw');
  // Calgary Transit's capitals, title cased, the quadrants kept.
  assert.equal(tidyHeadsign('RICHMOND RD SW', '22'), 'Richmond Rd SW');
  assert.equal(tidyHeadsign('69 ST STATION', '202'), '69 St Station');
});

test('scheduled departures have the shape of the real-time board', async () => {
  stubFetch({
    '/v5/stoptimes': stopTimesPayload(NOW, [
      { minutes: -5 },
      { minutes: 4, routeId: '66-20795', shortName: '66', headsign: 'LAKEVIEW' },
      { minutes: 2 },
    ]),
  });
  const board = await scheduledDepartures({ id: '5299', routes: [] }, { now: NOW });
  assert.deepEqual(
    board.map(({ route, minutes, realtime, headsign }) => [route, minutes, realtime, headsign]),
    [
      ['22', 2, false, 'Richmond Rd SW'],
      ['66', 4, false, 'Lakeview'],
    ],
  );
  const filtered = await scheduledDepartures({ id: '5299', routes: ['66'] }, { now: NOW });
  assert.deepEqual(
    filtered.map((departure) => departure.route),
    ['66'],
  );
});

test('a stop description is cached for a day, and survives a failed refresh', async () => {
  const calls = stubFetch({
    '/v5/stoptimes': stopTimesPayload(NOW, [
      { minutes: 1, routeId: '66-20795', shortName: '66', headsign: 'LAKEVIEW' },
      { minutes: 2 },
      { minutes: 3 },
    ]),
  });
  const description = await describeStop('5299', { now: NOW });
  assert.equal(formatRoutes(description), '22 → Richmond Rd SW, 66 → Lakeview');
  assert.equal(description.name, 'NB 1 ST SW @ 8 AV SW');
  // The trips seen at the stop name the route of a bare real-time prediction.
  assert.deepEqual(description.trips.get('T0'), { route: '66', headsign: 'Lakeview' });
  await describeStop('5299', { now: NOW + 3_600_000 });
  assert.equal(calls.length, 1);
  assert.equal(knownStop('5299'), description);

  restoreFetch();
  stubFetch({ '/v5/stoptimes': { status: 503, body: 'down' } });
  const stale = await describeStop('5299', { now: NOW + 2 * 86_400_000 });
  assert.equal(stale, description);
  assert.equal(await describeStop('00000', { now: NOW }), null);
});

test('a route serving both directions lists both', async () => {
  stubFetch({
    '/v5/stoptimes': stopTimesPayload(NOW, [
      { minutes: 1, headsign: 'West' },
      { minutes: 2, headsign: 'East' },
      { minutes: 3, headsign: 'West' },
    ]),
  });
  assert.equal(formatRoutes(await describeStop('5299', { now: NOW })), '22 → West/East');
});

test('distances', () => {
  assert.equal(distanceMeters(HOME, HOME), 0);
  const oneKmNorth = { lat: HOME.lat + 1 / 111.2, lon: HOME.lon };
  assert.ok(Math.abs(distanceMeters(HOME, oneKmNorth) - 1000) < 5);
});
