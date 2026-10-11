# CLAUDE.md

Guidance for Claude Code (and any other contributor) working in this repository.

## What this project is

An **external Gladys Assistant integration** for Calgary public transit
(Calgary Transit: buses and CTrain). It runs as a Docker container next to a
Gladys instance, talks to Gladys through the official SDK
(`@gladysassistant/integration-sdk`), and publishes **read-only** devices:
one per watched stop, one for the line status (CTrain Red and Blue lines).

Not affiliated with Calgary Transit nor the City of Calgary. Data: the
Calgary Transit static GTFS, GTFS-Realtime TripUpdates and service alerts
(City of Calgary open data, keyless; the static GTFS ships as a stop table in
`gtfs/`), and Transitous (keyless: the direction of the departures, stop
descriptions). **No key anywhere.**

**Inactive shared code.** Calgary has no docked bike share (`NETWORK.bike` is
null): `src/api/bikes.js` and `src/devices/bikeStation.js` stay, unused, to
keep the code identical to the sister repositories (they are tested in
gladys-translink and gladys-ttc), and so do the `stopFeed`, `lineAlerts` and
`scheduleOnly` paths of the TTC. `NETWORK.realtime.keyless` hides every key
setting, button and message.

**Design goal: usable by somebody who is not technical.** Nothing to type to
start: the house location (`location: true`) gives the suggested stops and
stations, there is no key, and the connection status line (`src/status.js`)
always says what to do next. Keep it that way: every new setting needs a
default that works, and every failure a message that says what to do.

**Sister integrations.** `gladys-translink` (Vancouver), `gladys-octranspo`
(Ottawa), `gladys-rtc-quebec` (Québec), `gladys-ttc` (Toronto),
`gladys-calgary-transit` (Calgary) and `gladys-edmonton-transit` (Edmonton)
share this code base, derived from `gladys-stm` (Montréal). Everything that
names the network lives in `src/network.js`, its data in `gtfs/`, its texts
in the manifest and the docs: the rest of the code is identical in the six
repositories, and a fix to it belongs in the six (and in gladys-stm when it
applies there).

## Commands

```bash
npm ci
npm test               # node --test, no framework, no network access
npm run lint           # eslint
npm run format         # prettier --write .
npm run format:check   # what CI checks
npm run update-stops   # regenerate gtfs/ from the Calgary Transit static GTFS (network)
npx github:GladysAssistant/integration-store .   # store admission checks
```

Run `npm test`, `npm run lint` and `npm run format:check` before every commit:
CI (`.github/workflows/ci.yml`) runs the three. The CI minutes are counted:
batch the pushes (one push a day at most, unless asked otherwise).

## Layout

```
index.js                      SDK wiring only: handlers, connect, status
src/network.js                the network: operator, feeds, key, lines, bike share
src/config.js                 defaults, type coercion, watch-list mini-syntax, request estimate
src/api/http.js               fetch with timeout and User-Agent
src/api/stops.js              the stop table (gtfs/): code → stop_ids, search, nearby, route labels
src/api/gtfsRealtime.js       minimal GTFS-Realtime decoder (watched stops only; alerts)
src/api/realtime.js           operator feeds (key or open): departures, feed caches, errors
src/api/lines.js              line status from the service alerts (GTFS-RT or translated JSON)
src/api/bikes.js              bike share GBFS client, per-cycle cache, station search
src/api/transitous.js         Transitous: departures of a stop code, descriptions
src/status.js                 the connection status line: what the user must do next
src/devices/index.js          device registry (typed + suggested + created) + manifest actions
src/devices/suggestions.js    the stops and bike stations closest to the house
src/devices/stop.js           one device per watched stop
src/devices/lineStatus.js     the line status device
src/devices/bikeStation.js    one device per watched bike station
src/devices/pollSchedule.js   drops the poll ticks inside the configured interval
src/devices/stateCache.js     drops the states that did not move since the last read
src/devices/publish.js        publishes only to the features the created device has
src/devices/readings.js       last reading per device, shared with the widgets
src/devices/refreshLoop.js    the container's own ticker over the created devices
src/scenes/triggers.js        scene events, computed between two polls of a device
src/scenes/actions.js         scene actions: a fresh read handed to the scene
src/widgets/index.js          dashboard widgets
scripts/update-stops.mjs      generates gtfs/ from the static GTFS (ZIP + CSV, no dependency)
gtfs/                         the stop table, shipped with the image
test/                         node:test suites; helpers: fake SDK, fetch stub, GTFS-RT encoder, fixtures
docs/en.md, docs/fr.md        user documentation (re-hosted by Gladys)
gladys-assistant-integration.json   the store manifest
```

Keep the separation: `index.js` holds no transit logic, `src/api/` only reads
the sources, `src/devices/` only turns a reading into features, `src/scenes/`
and `src/widgets/` only turn a blueprint's `read` into events, outputs and
cards.

## Data sources: what is known and how

- **Stop codes**: the 4-digit number on the sign (texted to 74500) is the
  GTFS `stop_code`, equal to the `stop_id` for every stop (checked on the
  static GTFS of 2026-09: 6,220 stops, no station rows). A CTrain platform is
  a stop of its own, one per direction ("EB City Hall/Bow Valley College
  (Free Fare Zone)"). `gtfs/stops.json` holds `[code, name, lat, lon, ids,
query]`.
- **Routes**: `route_id` is versioned, `<short name>-<service version>`
  ("201-20786" and "201-20801" are both the Red Line); the real-time feeds
  name the route by its short name ("201"). `gtfs/routes.json` maps both
  (`buildRoutes` in scripts/update-stops.mjs).
- **Real time**: GTFS-Realtime TripUpdates at
  `data.calgary.ca/download/gs4m-mdc2/application%2Foctet-stream`, keyless,
  ~0.8 MB, buses and CTrain. Its stop_ids and trip_ids are those of the
  static GTFS (2026-10: 26,159 of 26,435 stop times matched a trip of the
  static GTFS calling at that stop). Absolute times, no delay, no
  direction_id; the headsign comes from the trips Transitous saw at the stop,
  else from the only direction of the route there. The portal now and then
  publishes the file cut short, or empty, for 30 s to a minute or more while
  it rewrites it (a cache-busting query does not help): the last good read
  stands in for up to `STALE_FEED_MAX_MS` (5 min, src/api/realtime.js).
- **The decoder** (`src/api/gtfsRealtime.js`) was cross-checked against the
  official `gtfs-realtime-bindings` 2.2.0 in both directions. Re-run such a
  check if you touch the wire-format code.
- **Line status**: GTFS-Realtime alerts at
  `data.calgary.ca/download/jhgn-ynqj/application%2Foctet-stream`. Calgary
  Transit leaves `effect` and `header_text` empty and writes HTML in the
  description: `tidyCalgaryAlerts` (src/network.js) reads the effect from a
  `<div data-effect="DETOUR">` when there is one, the title from the first
  `<strong>`, and, without an effect, the wording: a closure or shuttle buses
  is REDUCED_SERVICE (disrupted), an elevator or escalator is an
  accessibility issue (ignored), anything else a notice. An alert counts for
  a line when it names the route (201, 202) without a stop.
- **Transitous**: ids are `ca-Calgary-Transit_<stop_id>`; it has Calgary
  Transit real time (`realTime: true`). Headsigns are in capitals ("RICHMOND
  RD SW"): `NETWORK.titleCaseHeadsigns` makes `tidyHeadsign` write "Richmond
  Rd SW", the city quadrants kept in capitals. Usage policy: open-source
  non-commercial, User-Agent with a contact, stay light — keep the caches and
  the 120 s floor (`MIN_SCHEDULE_POLL_FREQUENCY`).

## Conventions

- ES modules, Node >= 22, no runtime dependency besides the SDK. Do not add
  one without a strong reason (the 256 MB sandbox is why the GTFS-RT decoder is
  hand-written).
- Prettier decides formatting; ESLint decides the rest.
- Comments explain **why**, in full sentences, in English.
- Every user-visible string in the manifest, actions and widgets is bilingual
  (`{ en, fr }`); text features follow the `language` setting.
- **External ids, feature keys, manifest keys are forever**: Gladys keys the
  devices, their history, the scenes and the dashboards on them. The line ids
  of `src/network.js` (`red`, `blue`) are feature keys.
- **Created devices** are rebuilt from their params (`stop_code`, `routes`,
  `station_id`): never rename those params.
- **Versions belong to the Release workflow**: never edit `version` in
  `package.json` / the manifest, nor the `docker_image` tag, by hand.
- **Changelog**: every user-visible change adds a line under
  `## [Unreleased]` in `CHANGELOG.md`.
- **Never commit a personal stop**: use network landmarks in examples and
  tests (stop 5299, NB 1 ST SW @ 8 AV SW; City Hall CTrain platforms 6831
  and 6822; City Hall as the house).
- Tests never touch the network: `test/helpers/stubFetch.js` routes `fetch`.
  They do read the real `gtfs/` table: a regeneration that drops a landmark
  shows there.

## Roadmap ideas

- The Green Line (under construction): add it to `NETWORK.lines` (a new id)
  when its route appears in the alerts.
- The MAX bus rapid transit lines (Orange 303, Yellow 304, Teal 306, Purple 307) in the line status, if users ask for it: their alerts are mostly stop
  closures.
- Edmonton (ETS), Winnipeg, with the same code base.
- Ask the Transitous team for an explicit OK before the integration gets many
  users (their policy asks to be contacted for heavy use).
- Screenshots in the user documentation.
