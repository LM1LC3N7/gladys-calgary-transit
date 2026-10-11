// -----------------------------------------------------------------------------
// The transit network this integration serves: Calgary Transit, Calgary.
//
// Everything that names the operator, its feeds or its lines lives here, so
// the rest of the code reads "the network", "the bike share", "the lines" —
// and the sister integrations (TransLink, OC Transpo, RTC Québec, TTC) differ
// from this one by this file, their gtfs/ folder and their texts, not by their
// logic.
// -----------------------------------------------------------------------------

import { ALERT_EFFECT } from './api/gtfsRealtime.js';

/** The City of Calgary open data portal serves the feeds by dataset id. */
const OPEN_DATA = 'https://data.calgary.ca/download';

const EFFECTS = new Map(Object.entries(ALERT_EFFECT));

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };

/**
 * The plain text of an alert body written in HTML: tags dropped, entities
 * read, blank runs folded.
 * @param {string} html
 * @returns {string}
 */
export function htmlToText(html) {
  return String(html ?? '')
    .replace(/<\/?(p|li|ul|div|br)\b[^>]*>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&(#?\w+);/g, (entity, name) => ENTITIES[name.toLowerCase()] ?? entity)
    .replace(/\s+/g, ' ')
    .trim();
}

// A CTrain alert that names no effect but tells of a closure or of shuttle
// buses stops the trains on part of the line: it is a disruption, not a notice.
const SERVICE_STOPPED = /\b(closure|closed|no (train )?service|shuttle bus|suspended|disruption)/i;
// An elevator or an escalator out of order does not stop the line.
const ACCESSIBILITY = /\b(elevator|escalator)/i;

/**
 * The Calgary Transit alerts, tidied for src/api/lines.js.
 *
 * The feed leaves `effect` and `header_text` empty: the effect, when there is
 * one, is written in the HTML of the description (`<div
 * data-effect="DETOUR">`), and the title is its first `<strong>`. Without an
 * effect, the wording decides (SERVICE_STOPPED, ACCESSIBILITY): the Red Line
 * weekend closures come that way.
 *
 * @param {{ timestamp?: number, alerts: object[] }} feed a decoded alerts feed
 * @returns {{ timestamp?: number, alerts: object[] }}
 */
export function tidyCalgaryAlerts(feed) {
  const alerts = (feed?.alerts ?? []).map((alert) => {
    const html = (alert.descriptionText ?? []).map((entry) => entry?.text ?? '').join(' ');
    const text = htmlToText(html);
    const title = htmlToText(/<strong>([\s\S]*?)<\/strong>/i.exec(html)?.[1] ?? '');
    const named = EFFECTS.get(/data-effect="(\w+)"/.exec(html)?.[1] ?? '');
    let effect = alert.effect ?? named;
    if (effect === undefined) {
      if (ACCESSIBILITY.test(text)) effect = ALERT_EFFECT.ACCESSIBILITY_ISSUE;
      else if (SERVICE_STOPPED.test(text)) effect = ALERT_EFFECT.REDUCED_SERVICE;
      else effect = ALERT_EFFECT.UNKNOWN_EFFECT;
    }
    const header = (alert.headerText ?? []).some((entry) => entry?.text)
      ? alert.headerText
      : [{ text: title || text, language: 'en' }];
    return { ...alert, effect, headerText: header, descriptionText: [{ text, language: 'en' }] };
  });
  return { ...feed, alerts };
}

export const NETWORK = {
  /** The operator, as riders call it. */
  operator: 'Calgary Transit',
  /** The device names start with it: "Calgary Transit – EB Centre Street Station". */
  stopPrefix: 'Calgary Transit – ',
  /** The language of the texts when the user did not choose one. */
  defaultLanguage: 'en',

  /**
   * The static GTFS the stop table (gtfs/stops.json, gtfs/routes.json) is
   * generated from, by `npm run update-stops` (City of Calgary open data).
   */
  gtfs: {
    url: `${OPEN_DATA}/npk7-z3bj/application%2Fzip`,
    stopName: (row) => row.stop_name,
  },

  /** Transitous ids are the GTFS ids behind this prefix: `ca-Calgary-Transit_6830`. */
  transitousPrefix: 'ca-Calgary-Transit_',
  /** The headsigns are written in capitals ("CHINOOK STN"): title case them. */
  titleCaseHeadsigns: true,

  /**
   * The Calgary Transit real time, open: no key, no account. The
   * GTFS-Realtime TripUpdates cover the buses and the CTrain, with the
   * stop_ids and trip_ids of the static GTFS; the route is the short name
   * ("201"), which gtfs/routes.json also maps.
   */
  realtime: {
    keyless: true,
    keyLabel: null,
    portal: 'https://data.calgary.ca/browse?q=calgary%20transit',
    tripUpdatesUrl: `${OPEN_DATA}/gs4m-mdc2/application%2Foctet-stream`,
    alertsUrl: `${OPEN_DATA}/jhgn-ynqj/application%2Foctet-stream`,
    /** The alerts need their effect and title read from their HTML. */
    tidyAlerts: tidyCalgaryAlerts,
    /**
     * The request of one feed: nothing to add.
     * @param {string} url
     */
    authorize: (url) => ({ url, headers: {} }),
  },

  /**
   * The CTrain lines whose alerts make the "lines" device. `routeIds` are the
   * route ids of the alerts feed, the short names. The `id` keys are forever:
   * Gladys keys the features, the history and the scenes on them.
   */
  lines: [
    { id: 'red', routeIds: ['201'], name: { en: 'Red Line', fr: 'Ligne rouge' } },
    { id: 'blue', routeIds: ['202'], name: { en: 'Blue Line', fr: 'Ligne bleue' } },
  ],
  /** "CTrain" in the device and widget names. */
  linesName: { en: 'CTrain', fr: 'CTrain' },

  /** Calgary has no docked bike share (its shared bikes are free floating). */
  bike: null,

  /** The search example of the "Find a stop" answers: a network landmark. */
  examples: { search: 'City Hall' },
};
