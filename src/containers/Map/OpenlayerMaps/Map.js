import React, { Component } from 'react';
import 'ol/ol.css';
import './Map.css';
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import { Stroke, Style, Icon, Fill } from 'ol/style.js';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer.js';
import OSM from 'ol/source/OSM.js';
import VectorSource from 'ol/source/Vector.js';
import Feature from 'ol/Feature.js';
import { fromLonLat } from 'ol/proj.js';
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
    this.state = {
      coordinateInput: '',
      lamin: null,
      lomin: null,
      lamax: null,
      lomax: null,
    };
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

  handleCoordinateInputChange = (event) => {
    this.setState({ coordinateInput: event.target.value });
  };

  handleCoordinateSubmit = () => {
    const { coordinateInput } = this.state;
    // Parse koordinat dari string input
    const coordinates = coordinateInput.split(',').map((coord) => parseFloat(coord.trim()));
    // Cek apakah koordinat valid
    if (coordinates.length === 4 && !isNaN(coordinates[0]) && !isNaN(coordinates[1]) && !isNaN(coordinates[2]) && !isNaN(coordinates[3])) {
      // Atur tampilan ke koordinat yang dipilih
      const view = this.map.getView();
      const center = fromLonLat(coordinates); // Ubah koordinat menjadi titik dalam EPSG:3857
      view.setCenter(center);
      view.setZoom(2); // Ganti dengan zoom level yang diinginkan

      // Atur state dengan koordinat terkait
      this.setState(
        {
          lamin: coordinates[1] - 1,
          lomin: coordinates[0] - 1,
          lamax: coordinates[3] + 1,
          lomax: coordinates[2] + 1,
        },
        () => {
          this.drawBoundingBox();
        }
      );
    } else {
      // Tampilkan pesan kesalahan jika koordinat tidak valid
      alert('Koordinat tidak valid!');
    }
  };

  drawBoundingBox() {
    const { lamin, lomin, lamax, lomax } = this.state;

    const bboxSource = new VectorSource();
    const bboxLayer = new VectorLayer({
      source: bboxSource,
      style: new Style({
        stroke: new Stroke({
          color: 'blue',
          width: 5,
        }),
        fill: new Fill({
          color: 'rgba(0, 0, 255, 0.1)',
        }),
      }),
    });

    const bboxCoords = [
      [lomin, lamin],
      [lomin, lamax],
      [lomax, lamax],
      [lomax, lamin],
      [lomin, lamin],
    ];

    const bboxFeature = new Feature({
      geometry: new LineString(bboxCoords).transform('EPSG:4326', 'EPSG:3857'),
    });

    bboxSource.addFeature(bboxFeature);

    this.map.addLayer(bboxLayer);
  }

  render() {
    const { lamin, lomin, lamax, lomax } = this.state;
    return (
      <div>
        <div ref={this.mapRef} className="map-container" />
        <div className="coordinate-input">
          <form>
            <input
              type="text"
              name="coordinateInput"
              placeholder="Masukkan koordinat (longitude, latitude)"
              onChange={this.handleCoordinateInputChange}
            />
            <button type="button" onClick={this.handleCoordinateSubmit}>
              Go
            </button>
          </form>
        </div>
        {lamin !== null && lomin !== null && lamax !== null && lomax !== null && (
          <div>
            <p>Lamin: {lamin}</p>
            <p>Lomin: {lomin}</p>
            <p>Lamax: {lamax}</p>
            <p>Lomax: {lomax}</p>
          </div>
        )}
      </div>
    );
  }
}

export default MapComponent;
