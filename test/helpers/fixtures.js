// -----------------------------------------------------------------------------
// Payloads shared by the suites. The Transitous ones follow
// api.transitous.org (trimmed to the fields the integration reads); the
// alerts are GTFS-Realtime, encoded by the test encoder, written as Calgary
// Transit writes them (no effect, no header, an HTML description).
//
// Stops are network landmarks of the stop table (gtfs/stops.json), where the
// stop code is the stop_id:
//   5299  NB 1 ST SW @ 8 AV SW                             (routes 22, 66)
//   6831  EB City Hall/Bow Valley College, CTrain platform (201, 202)
//   6822  WB City Hall/Bow Valley College, CTrain platform (201, 202)
// Route ids are versioned ("22-20795"); the real-time feeds use the short
// names ("22", "201" the Red Line).
// -----------------------------------------------------------------------------

import { NETWORK } from '../../src/network.js';
import { encodeFeed } from './gtfsRealtimeEncoder.js';

// --- Service alerts ------------------------------------------------------------

/** The route_id of a line of NETWORK.lines. */
export const routeOf = (lineId) => NETWORK.lines.find((line) => line.id === lineId).routeIds[0];

/**
 * An alert about a whole line, as Calgary Transit writes it: no effect, an
 * empty header, the title in the first <strong> of an HTML description.
 */
export function lineAlert(
  lineId,
  html = '<p><strong>Red Line service disruption: Chinook - Heritage closure</strong>\n<p>Shuttle buses replace trains.',
  extra = {},
) {
  return {
    informedEntities: [{ agencyId: 'Calgary Transit', routeId: routeOf(lineId) }],
    headerText: [{ text: '', language: 'en' }],
    descriptionText: [{ text: html, language: 'en' }],
    ...extra,
  };
}

/** An alerts feed, encoded. */
export function alertsFeed(alerts = [], timestamp = 1_760_100_000) {
  return encodeFeed({
    timestamp,
    entities: alerts.map((alert, index) => ({ id: `alert-${index}`, alert })),
  });
}

// --- Transitous ---------------------------------------------------------------

/**
 * /v5/stoptimes for one stop: departures `minutes` from `now` (ms). The
 * default route is the 22, leaving from NB 1 ST SW @ 8 AV SW.
 */
export function stopTimesPayload(now, entries) {
  const iso = (ms) => new Date(ms).toISOString();
  const prefix = NETWORK.transitousPrefix;
  return {
    stopTimes: entries.map(
      (
        {
          minutes,
          routeId = '22-20795',
          shortName = '22',
          headsign = 'RICHMOND RD SW',
          stopId = '5299',
          delayMinutes = 0,
          cancelled = false,
          realTime = false,
          pickupType = 'NORMAL',
        },
        index,
      ) => ({
        place: {
          name: 'NB 1 ST SW @ 8 AV SW',
          stopId: `${prefix}${stopId}`,
          departure: iso(now + (minutes + delayMinutes) * 60_000),
          scheduledDeparture: iso(now + minutes * 60_000),
          pickupType,
        },
        realTime,
        headsign,
        tripId: `20261011_04:31_${prefix}T${index}`,
        routeId: `${prefix}${routeId}`,
        routeShortName: shortName,
        cancelled,
        tripCancelled: false,
      }),
    ),
  };
}
