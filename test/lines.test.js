// -----------------------------------------------------------------------------
// The line status, from the Calgary Transit GTFS-Realtime service alerts.
// -----------------------------------------------------------------------------

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyAlert,
  fetchLineStatus,
  isActive,
  LINE_STATUS,
  parseAlerts,
  pickText,
} from '../src/api/lines.js';
import { clearRealtimeCache } from '../src/api/realtime.js';
import { ALERT_EFFECT, decodeAlerts } from '../src/api/gtfsRealtime.js';
import { normalizeConfig } from '../src/config.js';
import { htmlToText, NETWORK, tidyCalgaryAlerts } from '../src/network.js';
import { alertsFeed, lineAlert, routeOf } from './helpers/fixtures.js';
import { restoreFetch, stubFetch } from './helpers/stubFetch.js';

const NOW_MS = 1_760_100_000_000;
const NOW = NOW_MS / 1000;
const ALERTS = new URL(NETWORK.realtime.alertsUrl).pathname;

const statuses = (status) => Object.fromEntries(status.lines.map((line) => [line.id, line.status]));
/** Decode, tidy and read a feed, as fetchLineStatus does. */
const read = (alerts, language = 'en') =>
  parseAlerts(tidyCalgaryAlerts(decodeAlerts(alertsFeed(alerts))), { language, now: NOW_MS });

beforeEach(() => clearRealtimeCache());
afterEach(() => restoreFetch());

test('no alert: every line runs normally', () => {
  const status = read([]);
  assert.ok(status.lines.every((line) => line.status === LINE_STATUS.NORMAL && !line.message));
  assert.deepEqual(
    status.lines.map((line) => line.id),
    ['red', 'blue'],
  );
});

test('a closure disrupts its line only, titled by the first <strong>', () => {
  const status = read([lineAlert('red')], 'fr');
  assert.equal(statuses(status).red, LINE_STATUS.DISRUPTED);
  assert.equal(statuses(status).blue, LINE_STATUS.NORMAL);
  // No French text: the English one rather than nothing.
  assert.equal(status.lines[0].message, 'Red Line service disruption: Chinook - Heritage closure');
});

test('the effect written in the HTML wins over the wording', () => {
  const status = read([
    lineAlert('blue', '<div data-effect="DETOUR"></div>\n<p>Shuttle buses on 8 Avenue.'),
  ]);
  assert.equal(statuses(status).blue, LINE_STATUS.NOTICE);
  // No <strong>: the whole text, without its tags.
  assert.equal(status.lines[1].message, 'Shuttle buses on 8 Avenue.');
});

test('station, accessibility and future alerts leave the line running', () => {
  const status = read([
    // An elevator: no effect, but the wording tells.
    lineAlert('red', '<p>The elevator at Sunnyside Station is closed for repairs.'),
    // A bus stop closed at a station of the line.
    lineAlert('blue', '<div data-effect="STOP_MOVED"></div><p>Stop closed.', {
      informedEntities: [{ routeId: routeOf('blue'), stopId: '6831' }],
    }),
    // Next weekend's closure, announced today.
    lineAlert('blue', '<p><strong>Weekend closure</strong>', {
      activePeriods: [{ start: NOW + 86_400 * 5, end: NOW + 86_400 * 6 }],
    }),
  ]);
  assert.ok(status.lines.every((line) => line.status === LINE_STATUS.NORMAL));
});

test('an alert without effect nor closure is a notice; the worst status wins', () => {
  const status = read([
    lineAlert('blue', '<p>Trains may run a few minutes late this evening.'),
    lineAlert('red', '<p>Expect crowding after the game.'),
    lineAlert('red'),
  ]);
  assert.equal(statuses(status).blue, LINE_STATUS.NOTICE);
  const red = status.lines.find((line) => line.id === 'red');
  assert.equal(red.status, LINE_STATUS.DISRUPTED);
  assert.equal(red.message, 'Red Line service disruption: Chinook - Heritage closure');
});

test('the tidying keeps what a feed already says', () => {
  const tidied = tidyCalgaryAlerts({
    alerts: [
      {
        effect: ALERT_EFFECT.NO_SERVICE,
        headerText: [{ text: 'Header', language: 'en' }],
        descriptionText: [{ text: '<p>Body &amp; more</p>' }],
      },
    ],
  }).alerts[0];
  assert.equal(tidied.effect, ALERT_EFFECT.NO_SERVICE);
  assert.equal(tidied.headerText[0].text, 'Header');
  assert.equal(tidied.descriptionText[0].text, 'Body & more');
  assert.equal(htmlToText('<ul><li>A</li><li>B&nbsp;C</li></ul>'), 'A B C');
  assert.deepEqual(tidyCalgaryAlerts(undefined).alerts, []);
});

test('helpers: texts, periods, effects', () => {
  const texts = [
    { text: 'Hello', language: 'en-CA' },
    { text: 'Bonjour', language: 'fr' },
  ];
  assert.equal(pickText(texts, 'fr'), 'Bonjour');
  assert.equal(pickText(texts, 'en'), 'Hello');
  assert.equal(pickText([{ text: 'Only' }], 'fr'), 'Only');
  assert.equal(pickText(undefined, 'fr'), '');
  assert.equal(isActive({ activePeriods: [] }, NOW), true);
  assert.equal(isActive({ activePeriods: [{ start: NOW - 10 }] }, NOW), true);
  assert.equal(isActive({ activePeriods: [{ end: NOW - 10 }] }, NOW), false);
  assert.equal(classifyAlert({ effect: 3 }), LINE_STATUS.DISRUPTED);
  assert.equal(classifyAlert({ effect: 7, severity: 4 }), LINE_STATUS.DISRUPTED);
  assert.equal(classifyAlert({ effect: 7 }), LINE_STATUS.NOTICE);
});

test('the status is read from the open alerts feed, without a key', async () => {
  const calls = stubFetch({ [ALERTS]: alertsFeed([lineAlert('red')]) });
  const status = await fetchLineStatus(normalizeConfig(), { now: NOW_MS });
  assert.equal(statuses(status).red, LINE_STATUS.DISRUPTED);
  assert.equal(calls[0].url, NETWORK.realtime.alertsUrl);
});
