import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

mapboxgl.accessToken = 'pk.eyJ1IjoiZGllZ29pbm8xIiwiYSI6ImNtcDdqejZ4YzAzeXozM3B4ZjFoeDNldmoifQ.IVfoP8b-9V1PsWSfhO53kQ';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/diegoino1/cmp7qseda000x01sm3kcf5wc9',
  center: [-71.09415, 42.36027],
  zoom: 12, minZoom: 5, maxZoom: 18,
});

const bikeLanePaint = {
  'line-color': '#32D400',
  'line-width': 3,
  'line-opacity': 0.6,
};

const svg = d3.select('#map').select('svg');

function getCoords(station) {
  const point = new mapboxgl.LngLat(+station.Long, +station.Lat);
  const { x, y } = map.project(point);
  return { cx: x, cy: y };
}

map.on('load', async () => {
  map.addSource('boston_route', { type: 'geojson', data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson' });
  map.addLayer({ id: 'boston-bike-lanes', type: 'line', source: 'boston_route', paint: bikeLanePaint });
  map.addSource('cambridge_route', { type: 'geojson', data: 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson' });
  map.addLayer({ id: 'cambridge-bike-lanes', type: 'line', source: 'cambridge_route', paint: bikeLanePaint });

  let stations;
  try {
    const jsonData = await d3.json('https://dsc106.com/labs/lab07/data/bluebikes-stations.json');
    stations = jsonData.data.stations;
  } catch (error) {
    console.error('Error loading stations:', error);
    return;
  }

  // Fetch trip data (~21MB, may take a moment)
  let trips;
  try {
    trips = await d3.csv('https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv');
    console.log('Loaded trips:', trips.length);
  } catch (error) {
    console.error('Error loading trips:', error);
    return;
  }

  // Count departures and arrivals per station
  const departures = d3.rollup(trips, (v) => v.length, (d) => d.start_station_id);
  const arrivals   = d3.rollup(trips, (v) => v.length, (d) => d.end_station_id);

  // Enrich each station with traffic data
  stations = stations.map((station) => {
    const id = station.short_name;
    station.arrivals   = arrivals.get(id) ?? 0;
    station.departures = departures.get(id) ?? 0;
    station.totalTraffic = station.arrivals + station.departures;
    return station;
  });
  console.log('Stations with traffic:', stations);

  // Square-root scale so circle area encodes traffic
  const radiusScale = d3
    .scaleSqrt()
    .domain([0, d3.max(stations, (d) => d.totalTraffic)])
    .range([0, 25]);

  const circles = svg
    .selectAll('circle')
    .data(stations)
    .enter()
    .append('circle')
    .attr('r', (d) => radiusScale(d.totalTraffic))
    .attr('fill', 'steelblue')
    .attr('stroke', 'white')
    .attr('stroke-width', 1)
    .each(function(d) {
      d3.select(this)
        .append('title')
        .text(`${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);
    });

  function updatePositions() {
    circles
      .attr('cx', (d) => getCoords(d).cx)
      .attr('cy', (d) => getCoords(d).cy);
  }

  updatePositions();
  map.on('move', updatePositions);
  map.on('zoom', updatePositions);
  map.on('resize', updatePositions);
  map.on('moveend', updatePositions);
});