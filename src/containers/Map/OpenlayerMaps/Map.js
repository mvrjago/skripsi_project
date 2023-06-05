import React, { Component } from 'react';
import 'ol/ol.css';
import '../OpenlayerMaps/Map.css';
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import { Stroke, Style, Icon } from 'ol/style.js';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer.js';
import OSM from 'ol/source/OSM.js'; // Import OSM source
import VectorSource from 'ol/source/Vector.js';
import Feature from 'ol/Feature.js';
import LineString from 'ol/geom/LineString.js';
import { getVectorContext } from 'ol/render.js';
import { getWidth } from 'ol/extent.js';
import arc from 'arc';
import airplaneimg from './614.png';

const tileLayer = new TileLayer({
  source: new OSM(), // Use OSM source
});

const map = new Map({
  layers: [tileLayer],
  target: 'map', // Update target to match the ID of the HTML element
  view: new View({
    center: [-11000000, 4600000],
    zoom: 2,
  }),
});

const airplaneIcon = new Icon({
  src: airplaneimg, // Use the imported image file
  scale: 0.5, // Scale the size of the icon if needed
});

const style = new Style({
  stroke: new Stroke({
    color: 'red',
    width: 2,
  }),
  image: airplaneIcon, // Set the airplane icon as the symbol
});

const flightsSource = new VectorSource({
  attributions:
    'Flight data by ' +
    '<a href="https://openflights.org/data.html">OpenFlights</a>,',
  loader: function () {
    const url = '/data/openflights/flights.json'; // Update the URL
    fetch(url)
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(function (json) {
        const flightsData = json.flights;
        for (let i = 0; i < flightsData.length; i++) {
          const flight = flightsData[i];
          const from = flight[0];
          const to = flight[1];

          const arcGenerator = new arc.GreatCircle(
            { x: from[1], y: from[0] },
            { x: to[1], y: to[0] }
          );

          const arcLine = arcGenerator.Arc(100, { offset: 10 });
          const features = [];
          arcLine.geometries.forEach(function (geometry) {
            const line = new LineString(geometry.coords);
            line.transform('EPSG:4326', 'EPSG:3857');

            features.push(
              new Feature({
                geometry: line,
                finished: false,
              })
            );
          });

          addLater(features, i * 50);
        }

        tileLayer.on('postrender', animateFlights);
      })
      .catch(function (error) {
        console.error('Error fetching JSON:', error);
        console.error('URL:', url);
      });
  },
});

const flightsLayer = new VectorLayer({
  source: flightsSource,
  style: function (feature) {
    if (feature.get('finished')) {
      return style;
    }
    return null;
  },
});

map.addLayer(flightsLayer);

const pointsPerMs = 0.02;
function animateFlights(event) {
  const vectorContext = getVectorContext(event);
  const frameState = event.frameState;
  vectorContext.setStyle(style);

  const features = flightsSource.getFeatures();
  for (let i = 0; i < features.length; i++) {
    const feature = features[i];
    if (!feature.get('finished')) {
      const coords = feature.getGeometry().getCoordinates();
      const elapsedTime = frameState.time - feature.get('start');
      if (elapsedTime >= 0) {
        const elapsedPoints = elapsedTime * pointsPerMs;

        if (elapsedPoints >= coords.length) {
          feature.set('finished', true);
        }

        const maxIndex = Math.min(elapsedPoints, coords.length);
        const currentLine = new LineString(coords.slice(0, maxIndex));

        const worldWidth = getWidth(map.getView().getProjection().getExtent());
        const offset = Math.floor(map.getView().getCenter()[0] / worldWidth);

        currentLine.translate(offset * worldWidth, 0);
        vectorContext.drawGeometry(currentLine);
        currentLine.translate(worldWidth, 0);
        vectorContext.drawGeometry(currentLine);
      }
    }
  }

  map.render();
}

function addLater(features, timeout) {
  window.setTimeout(function () {
    let start = Date.now();
    features.forEach(function (feature) {
      feature.set('start', start);
      flightsSource.addFeature(feature);
      const duration =
        (feature.getGeometry().getCoordinates().length - 1) / pointsPerMs;
      start += duration;
    });
  }, timeout);
}

class MapComponent extends Component {
  componentDidMount() {
    map.setTarget(this.mapRef);
  }

  render() {
    return <div ref={(ref) => (this.mapRef = ref)} className="map" />;
  }
}

export default MapComponent;
