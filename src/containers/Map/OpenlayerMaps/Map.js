import React, { Component } from 'react';
import 'ol/ol.css';
import '../OpenlayerMaps/Map.css';
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import { Stroke, Style, Icon } from 'ol/style.js';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer.js';
import OSM from 'ol/source/OSM.js';
import VectorSource from 'ol/source/Vector.js';
import Feature from 'ol/Feature.js';
import LineString from 'ol/geom/LineString.js';
import { getVectorContext } from 'ol/render.js';
import { getWidth } from 'ol/extent.js';
import arc from 'arc';
import airplaneimg from './614.png';

class MapComponent extends Component {
  constructor(props) {
    super(props);
    this.mapRef = React.createRef();
    this.map = null;
    this.flightsSource = null;
    this.tileLayer = null;
    this.flightsLayer = null;
    this.style = null;
    this.airplaneIcon = null;
    this.pointsPerMs = 0.02;
  }

  componentDidMount() {
    this.initializeMap();
  }

  initializeMap() {
    this.tileLayer = new TileLayer({
      source: new OSM(),
    });

    this.map = new Map({
      layers: [this.tileLayer],
      target: this.mapRef.current,
      view: new View({
        center: [-11000000, 4600000],
        zoom: 2,
      }),
    });

    this.airplaneIcon = new Icon({
      src: airplaneimg,
      scale: 0.5,
    });

    this.style = new Style({
      stroke: new Stroke({
        color: 'red',
        width: 2,
      }),
      image: this.airplaneIcon,
    });

    this.flightsSource = new VectorSource({
      attributions:
        'Flight data by ' +
        '<a href="https://openflights.org/data.html">OpenFlights</a>,',
      loader: () => {
        const url = '/data/openflights/flights.json';
        fetch(url)
          .then((response) => {
            if (!response.ok) {
              throw new Error('Network response was not ok');
            }
            return response.json();
          })
          .then((json) => {
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
              arcLine.geometries.forEach((geometry) => {
                const line = new LineString(geometry.coords);
                line.transform('EPSG:4326', 'EPSG:3857');

                features.push(
                  new Feature({
                    geometry: line,
                    finished: false,
                  })
                );
              });

              this.addLater(features, i * 50);
            }

            this.tileLayer.on('postrender', this.animateFlights);
          })
          .catch((error) => {
            console.error('Error fetching JSON:', error);
            console.error('URL:', url);
          });
      },
    });

    this.flightsLayer = new VectorLayer({
      source: this.flightsSource,
      style: (feature) => {
        if (feature.get('finished')) {
          return this.style;
        }
        return null;
      },
    });

    this.map.addLayer(this.flightsLayer);
  }

  animateFlights = (event) => {
    const vectorContext = getVectorContext(event);
    const frameState = event.frameState;
    vectorContext.setStyle(this.style);

    const features = this.flightsSource.getFeatures();
    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      if (!feature.get('finished')) {
        const coords = feature.getGeometry().getCoordinates();
        const elapsedTime = frameState.time - feature.get('start');
        if (elapsedTime >= 0) {
          const elapsedPoints = elapsedTime * this.pointsPerMs;

          if (elapsedPoints >= coords.length) {
            feature.set('finished', true);
          }

          const maxIndex = Math.min(elapsedPoints, coords.length);
          const currentLine = new LineString(coords.slice(0, maxIndex));

          const worldWidth = getWidth(this.map.getView().getProjection().getExtent());
          const offset = Math.floor(this.map.getView().getCenter()[0] / worldWidth);

          currentLine.translate(offset * worldWidth, 0);
          vectorContext.drawGeometry(currentLine);
          currentLine.translate(worldWidth, 0);
          vectorContext.drawGeometry(currentLine);
        }
      }
    }

    this.map.render();
  };

  addLater(features, timeout) {
    window.setTimeout(() => {
      let start = Date.now();
      features.forEach((feature) => {
        feature.set('start', start);
        this.flightsSource.addFeature(feature);
        const duration =
          (feature.getGeometry().getCoordinates().length - 1) / this.pointsPerMs;
        start += duration;
      });
    }, timeout);
  }

  render() {
    return <div ref={this.mapRef} className="map" />;
  }
}

export default MapComponent;
