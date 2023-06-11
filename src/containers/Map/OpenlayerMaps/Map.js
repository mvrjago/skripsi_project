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
    this.loadFlightsData();
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

    this.flightsSource = new VectorSource({
      loader: () => {
        this.loadFlightsData(); // Load data penerbangan saat komponen dipasang
        // Set interval untuk memuat data penerbangan setiap 10 detik (10000 milidetik)
        setInterval(() => {
          this.loadFlightsData();
        }, 10000);
      }
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
      image: this.airplaneIcon
    });

    this.airplanesSource = new VectorSource();
    this.airplanesLayer = new VectorLayer({
      source: this.airplanesSource,
      style: new Style({
        image: this.airplaneIcon,
      }),
    });

    this.flightsSource = new VectorSource();
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
    this.map.addLayer(this.airplanesLayer);
  }

  loadFlightsData() {
    const url = 'http://127.0.0.1:5000/aircraft/';
  
    const fetchData = () => {
      fetch(url)
        .then((response) => {
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          return response.json();
        })
        .then((json) => {
          const flightsData = json.flights;
  
          // Menghitung total batch yang diperlukan
          const totalBatches = Math.ceil(flightsData.length / 1000);
  
          // Memuat data dalam batch menggunakan setTimeout
          let batchIndex = 0;
          const loadNextBatch = () => {
            const startIndex = batchIndex * 1000;
            const endIndex = (batchIndex + 1) * 1000;
            const flightsBatch = flightsData.slice(startIndex, endIndex);
  
            this.loadFlightsBatch(flightsBatch);
  
            batchIndex++;
  
            if (batchIndex < totalBatches) {
              setTimeout(loadNextBatch, 20000); // Menunggu 1 detik sebelum memuat batch berikutnya
            }
  
            this.map.render();
          };
  
          loadNextBatch();
        })
        .catch((error) => {
          console.error('Error fetching JSON:', error);
          console.error('URL:', url);
        });
    };
  
    // Memuat data pertama kali saat halaman dimuat
    fetchData();
  
    // Memuat data secara berkala setiap 5 detik
    setInterval(fetchData, 20000);
  }

  loadFlightsBatch(flightsBatch) {
    const { lamin, lomin, lamax, lomax } = this.state;
  
    for (let i = 0; i < flightsBatch.length; i++) {
      const flights = flightsBatch[i];
      const from = flights[0];
      const to = flights[1];
  
      // Periksa apakah nilai 'from' dan 'to' valid sebelum mengakses indeksnya
      if (from && from.length >= 2 && to && to.length >= 2) {
        const fromLonLat = from.map(coord => parseFloat(coord));
        const toLonLat = to.map(coord => parseFloat(coord));
  
        // Periksa apakah koordinat penerbangan berada di dalam bbox
        if (
          fromLonLat[1] >= lomin &&
          fromLonLat[1] <= lomax &&
          fromLonLat[0] >= lamin &&
          fromLonLat[0] <= lamax &&
          toLonLat[1] >= lomin &&
          toLonLat[1] <= lomax &&
          toLonLat[0] >= lamin &&
          toLonLat[0] <= lamax
        ) {
          const arcGenerator = new arc.GreatCircle(
            { x: fromLonLat[1], y: fromLonLat[0] },
            { x: toLonLat[1], y: toLonLat[0] }
          );
  
          const arcLine = arcGenerator.Arc(100, { offset: 10});
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
      }
    }
  
    this.tileLayer.on('postrender', this.animateFlights);
  }
  

  animateFlights = (event) => {
    const { lamin, lomin, lamax, lomax } = this.state;

    // Periksa apakah bbox telah digambar sebelumnya
    if (lamin !== null && lomin !== null && lamax !== null && lomax !== null) {
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
    }
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
    // Hapus vektor bbox sebelumnya (jika ada)
    this.removeBoundingBox();

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

removeBoundingBox() {
  const layers = this.map.getLayers().getArray();
  const bboxLayers = layers.filter(layer => layer.get('name') === 'bboxLayer');
  bboxLayers.forEach(bboxLayer => {
    this.map.removeLayer(bboxLayer);
  });
}

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

    bboxLayer.set('name', 'bboxLayer'); // Setel nama lapisan untuk dapat diakses saat dihapus

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
          <div className="bbox-info">
            Bounding box: [{lamin}, {lomin}, {lamax}, {lomax}]
          </div>
        )}
      </div>
    );
  }
}

export default MapComponent;