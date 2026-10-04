# How the 3D Pewe was made

The front page draws the real village from these files in `public/map/`.

| File | What it is | Where it came from |
|---|---|---|
| `terrain.bin` | Heights and water. A 10 m grid over the village (2.4 × 2.35 km) and a 100 m grid out to the sea (24 × 24 km). Heights are Int16 decimetres; water is Uint8 0–100. | Copernicus DEM GLO-30, tile N17 E073, with its water-body mask |
| `village.json` | Roads, houses, places, the paddy, the pipes, the bridge, boats and the bus route, in metres east/north of the Community Building. Also the grid sizes. | Traced against the committee's own map marks; see below |
| `world.json` | Coastlines for the world finale. | Natural Earth 1:50m land, via the `world-atlas` package (`build-world.mjs`) |

## The land

- **Source.** Copernicus GLO-30, tile `Copernicus_DSM_COG_10_N17_00_E073_00_DEM`, plus its `WBM` water mask, from the AWS open-data bucket `copernicus-dem-30m`.
- **Removing tree cover.** GLO-30 is a surface model, so it measures the tops of the trees rather than the ground. The grid is grey-opened (50 m) and smoothed. Within 170 m of the main road, the land is capped to a gentle valley-floor slope, so the houses sit on the ground and not on the trees.
- **Heights in the scene.** They are exaggerated × 1.25. The creek bed is pushed under a water plane at sea level, and the ground under each landmark is levelled.

## The village

- **The map.** The committee's Google Maps screenshot was matched to the land by the shape of the creek, and checked against the "Peve Guhagar" pin (17.5605, 73.2422) to about 10 m.
- **What came from the marks.** Roads were traced by hand. The haveli, the bus stop, the Community Building's position and the school came from the committee's own marks on that screenshot. The screenshot itself is not stored here.
- **Houses.** These are placed procedurally along the lanes of each hamlet: Amshet Bhoiwadi, Rab Bhoiwadi, Pere and Pardalewadi. They are **not** individual real homes, and every house is drawn the same way on purpose.

## Credits shown on the site

> The land is drawn from the Copernicus DEM GLO-30, © DLR e.V. 2010–2014 and © Airbus Defence and Space GmbH 2014–2018, provided under COPERNICUS by the European Union and ESA. Coastlines from Natural Earth. Weather from Open-Meteo.
