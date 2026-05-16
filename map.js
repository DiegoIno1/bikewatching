// Import Mapbox as an ESM module
import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

mapboxgl.accessToken = 'pk.eyJ1IjoiZGllZ29pbm8xIiwiYSI6ImNtcDdqejZ4YzAzeXozM3B4ZjFoeDNldmoifQ.IVfoP8b-9V1PsWSfhO53kQ';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/diegoino1/cmp7qseda000x01sm3kcf5wc9',
  center: [-71.09415, 42.36027],
  zoom: 12,
  minZoom: 5,
  maxZoom: 18,
});

// Shared paint style for bike lane layers
const bikeLanePaint = {
  'line-color': '#32D400',
  'line-width': 3,
  'line-opacity': 0.6,
};

// Select the SVG overlay inside the map container
const svg = d3.select('#map').select('svg');

// Convert station lon/lat to SVG pixel coordinates
function getCoords(station) {
  const point = new mapboxgl.LngLat(+station.Long, +station.Lat);
  const { x, y } = map.project(point);
  return { cx: x, cy: y };
}

map.on('load', async () => {
  // Boston bike lanes
  map.addSource('boston_route', {
    type: 'geojson',
    data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson',
  });
  map.addLayer({ id: 'boston-bike-lanes', type: 'line', source: 'boston_route', paint: bikeLanePaint });

  // Cambridge bike lanes
  map.addSource('cambridge_route', {
    type: 'geojson',
    data: 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson',
  });
  map.addLayer({ id: 'cambridge-bike-lanes', type: 'line', source: 'cambridge_route', paint: bikeLanePaint });

  // Load Bluebikes station data
  let stations;
  try {
    const jsonData = await d3.json('https://dsc106.com/labs/lab07/data/bluebikes-stations.json');
    console.log('Loaded JSON Data:', jsonData);
    stations = jsonData.data.stations;
    console.log('Stations Array:', stations);
  } catch (error) {
    console.error('Error loading JSON:', error);
    return;
  }

  // Draw a circle for each station
  const circles = svg
    .selectAll('circle')
    .data(stations)
    .enter()
    .append('circle')
    .attr('r', 5)
    .attr('fill', 'steelblue')
    .attr('stroke', 'white')
    .attr('stroke-width', 1)
    .attr('opacity', 0.8);

  // Reproject circles whenever the map moves
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