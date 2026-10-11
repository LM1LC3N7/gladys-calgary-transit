# Gladys Calgary Transit

External integration for [Gladys Assistant](https://gladysassistant.com) that
brings Calgary public transit into your smart home:

- **next Calgary Transit departures in real time** for every bus stop and
  CTrain platform;
- **status of the CTrain lines** (Red Line, Blue Line), from the Calgary
  Transit service alerts.

**Nothing to configure, no key, no account:** the integration reads the
location of the house from Gladys and offers the closest stops in the
Discover tab, named the way people know them ("Calgary Transit – EB City
Hall/Bow Valley College (Free Fare Zone) (201 → Somerset-Bridlewood, 202 →
Saddletowne)").

Unofficial: not affiliated with Calgary Transit nor the City of Calgary.

User documentation: [français](docs/fr.md) · [English](docs/en.md).

## What you get in Gladys

| Kind                  | Content                                                                                        |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| Devices               | one per stop (minutes to wait, route, summary), one for the CTrain (status + message per line) |
| Dashboard widgets     | departures board, CTrain line status                                                           |
| Scene triggers        | departure approaching (1–15 min), line disrupted / restored / notice                           |
| Scene actions         | read the next departures of a stop, read the status of a line                                  |
| Configuration buttons | find a stop by name                                                                            |

Requires Gladys **5.1.0** or later.

## How it works

- **The stop table** (`gtfs/stops.json`, `gtfs/routes.json`) is generated from
  the Calgary Transit static GTFS (City of Calgary open data) by
  `npm run update-stops` and ships with the image. It answers the stop search
  and the "near my home" suggestions without any request.
- **Departures**: the Calgary Transit GTFS-Realtime TripUpdates (open, no
  key), read once a minute for every watched stop at once. They cover the
  buses and the CTrain. The direction of each departure comes from
  [Transitous](https://transitous.org/sources/).
- **Line status**: the Calgary Transit GTFS-Realtime service alerts. Their
  effect and title are written in the HTML of the description: the
  integration reads them there.

## Development

```bash
npm install
npm test               # node --test, no network access
npm run lint           # ESLint
npm run format:check   # Prettier, as the CI runs it
npm run update-stops   # regenerate gtfs/ from the Calgary Transit static GTFS
npx github:GladysAssistant/integration-store .   # store admission checks
```

The project follows the official
[integration template](https://github.com/GladysAssistant/integration-template-js):
Node 22+, ES modules, the Gladys SDK as the only runtime dependency, a Docker
image published to GHCR by the Release workflow. It shares its code with
[gladys-stm](https://github.com/LM1LC3N7/gladys-stm),
[gladys-translink](https://github.com/LM1LC3N7/gladys-translink),
[gladys-octranspo](https://github.com/LM1LC3N7/gladys-octranspo),
[gladys-rtc-quebec](https://github.com/LM1LC3N7/gladys-rtc-quebec) and
[gladys-ttc](https://github.com/LM1LC3N7/gladys-ttc): the network lives in
`src/network.js`. See [CLAUDE.md](CLAUDE.md) for the architecture and the
conventions.

### Publishing a version

1. In GitHub: **Actions → Release → Run workflow**. Choose **minor** for the
   first release (0.0.0 → 0.1.0), then patch / minor / major. It bumps the
   version everywhere, rolls the changelog, tags, builds the multi-arch image
   (`linux/amd64`, `linux/arm64`) and creates the GitHub Release.
2. The first time only: make the GHCR package **public**
   (`github.com/LM1LC3N7/gladys-calgary-transit/pkgs/container/gladys-calgary-transit`
   → Package settings → Change visibility). The store refuses an image it
   cannot pull.
3. Add the topic `gladys-assistant-integration` to the repository: the store
   indexer picks the integration up within the hour.

## Data and licences

- Stop list, real time and alerts: Calgary Transit data published by the City
  of Calgary on its [open data portal](https://data.calgary.ca), under the
  [Open Government Licence – City of Calgary](https://data.calgary.ca/stories/s/Open-Calgary-Terms-of-Use/u45n-7awa).
- Directions: [Transitous](https://transitous.org/sources/) (free community
  service; the integration sends a User-Agent naming it and caches every
  description for a day).
- Code: Apache License 2.0. Parts of `src/devices/` are adapted from
  [prohand/gladys-transport-commun-lyonnais](https://github.com/prohand/gladys-transport-commun-lyonnais)
  (Apache-2.0), see [NOTICE](NOTICE).
