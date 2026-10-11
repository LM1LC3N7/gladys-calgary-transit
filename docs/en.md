# Calgary Transit

The **next Calgary Transit departures** (bus and CTrain) in real time and the
**status of the CTrain lines** near your home, in Gladys.

This integration is not affiliated with Calgary Transit nor the City of
Calgary.

## Get started in 3 steps

No technical knowledge is needed, and no account: there is **nothing to
create, no key**.

1. **Check the address of your house in Gladys**: _Settings → Houses_. The
   house must have a position on the map. The integration uses it to find the
   stops near you. The position stays in your Gladys.
2. **Install the integration** from the integration catalog, and accept the
   access to the house location. Open its configuration page and press
   **Save**, without filling anything in.
3. Open the **Discover** tab of the integration. The 3 stops closest to your
   home are offered there, with their name and the direction of their routes,
   e.g. "Calgary Transit – NB 1 ST SW @ 8 AV SW (22 → Richmond Rd SW, 66 →
   Lakeview)", as well as the **Calgary Transit – CTrain** device. Press
   **Add** on each one you want.

That's it. You now get the **next departures** at each stop and the status of
the CTrain lines.

The message at the top of the configuration page always tells you what to do
next. For example: "Ready: 3 stops and the lines to add. Open the Discover
tab…".

Device names start with **Calgary Transit –**, so they are easy to find in
the device list of Gladys. You can rename them freely in Gladys.

### Showing the departures on the dashboard

1. Open the dashboard, then press **Edit**.
2. Add a widget and choose **Calgary Transit departures**.
3. Choose the stop, then save.

The **CTrain line status** widget is added the same way.

## Where the departures come from

Calgary Transit publishes its real-time predictions in the open, for the
buses and the CTrain: the integration reads them every minute, for all your
stops at once. The direction of each departure ("→ Richmond Rd SW") comes
from Transitous, a free community service.

A CTrain station has one stop per platform, one per direction: "EB City
Hall/Bow Valley College" (eastbound) and "WB City Hall/Bow Valley College"
(westbound).

## Watching other stops (work, school…)

For a stop far from home:

1. At the bottom of the configuration page, press **Find a stop**. Type a
   street, a station or the stop number, e.g. "City Hall" or "1 St SW 8 Av".
2. The answer lists the stops with their number and the direction of their
   routes, e.g. `5299 — NB 1 ST SW @ 8 AV SW (22 → Richmond Rd SW, 66 →
Lakeview)`.
3. Copy the number (`5299`) in **Stops**, save, then add the stop in the
   **Discover** tab.

The number is the one written on every Calgary Transit stop sign (the one
texted to 74500).

### Going further

The **Stops** field accepts several numbers separated by commas, a route
filter after `@` and a name after `:`.

| Entry                 | Meaning                               |
| --------------------- | ------------------------------------- |
| `5299`                | every route calling at stop 5299      |
| `5299@22`             | route 22 only                         |
| `5299@22\|66`         | routes 22 and 66                      |
| `5299@22:Bus to work` | route 22, displayed as "Bus to work"  |
| `6831@202`            | the Blue Line at City Hall, eastbound |

## What each device holds

**Stop:**

- **Next departure**, **Departure 2**…: the minutes to wait. 999 means no
  departure is coming.
- **Next departure route**…: the route ("22", "201" for the Red Line, "202"
  for the Blue Line).
- **Next departures**: a summary, e.g. `22 3 min · 66 11 min`.

**CTrain:** for each line (Red Line, Blue Line), a **status** (`Normal`,
`Disrupted`, `Notice` or `Unknown`) and the **message** of the Calgary
Transit alert. A closure between stations, with shuttle buses, is a
disruption; a detour or any other announcement is a notice. Elevators and
escalators, and the alerts about a single station, do not change the status
of a line.

## Scenes

**Triggers:**

- **Departure approaching**: a departure gets under 1, 2, 3, 5, 10 or 15
  minutes. Example: "when the 22 is 5 minutes away, turn the hall light on".
- **Line status changed**: a line is disrupted, gets back to normal, or
  receives a notice. Example: "if the Red Line is disrupted, send me a
  message".

**Actions:**

- **Read the next departures**: e.g. a message every morning "Your 22 comes
  in {{minutes}} minutes".
- **Read a line status**: returns the status, the Calgary Transit message and
  `normal` (true or false).

## Troubleshooting

| Message or symptom                                | What to do                                                                                             |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| "set the address of your house"                   | _Settings → Houses_: place the house on the map, then save the configuration of the integration again. |
| "Gladys did not share the location of your house" | Reinstall the integration and accept the location access, or type stop numbers.                        |
| Nothing in the Discover tab                       | Read the message of the configuration page: it says what is missing.                                   |
| "Stop … is not in the Calgary Transit stop list"  | Check the number on the sign. A brand new stop comes with the next version of the integration.         |
| A stop stays at 999                               | No departure coming (at night), or a route filter matching no route of the stop.                       |
| A departure has no direction                      | Its trip was not listed yet by Transitous: the direction comes back within the day.                    |

## Privacy, data and licences

- The house location is only used to look the nearby stops up, in the stop
  list shipped with the integration: it is sent nowhere.
- Stop list, real time and alerts: Calgary Transit data, City of Calgary
  open data, under the
  [Open Government Licence – City of Calgary](https://data.calgary.ca/stories/s/Open-Calgary-Terms-of-Use/u45n-7awa)
  (the stop list is updated with every version).
- Directions: [Transitous](https://transitous.org/sources/), a free community
  service, from the Calgary Transit data.
- Integration code: Apache 2.0 licence.
