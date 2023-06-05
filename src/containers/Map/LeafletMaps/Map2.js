import React, { Component } from 'react';
import 'leaflet/dist/leaflet.css';
import '../LeafletMaps/Map2.css';
import L from 'leaflet';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import 'leaflet-polylinedecorator/dist/leaflet.polylineDecorator.js';


class MapComponent2 extends Component {
  constructor(props) {
    super(props);

    this.state = {
      center: [0, 0],
      zoom: 1,
      bboxCoordinates: [],
      drawing: false,
    };

    this.map = null;
    this.mapRef = React.createRef();
    this.rectangleLayer = null;
    this.rectangle = null;
    this.airplaneLayer = null;
    this.airplaneIcon = L.icon({
      iconUrl: '/614.png',
      iconSize: [32, 32],
    });
    this.flightData = []; // Array to store flight data
  }

  componentDidMount() {
    this.map = L.map(this.mapRef.current).setView(this.state.center, this.state.zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: 'Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
    }).addTo(this.map);

    this.map.on('moveend', () => {
      const center = this.map.getCenter();
      const zoom = this.map.getZoom();
      this.setState({ center: [center.lat, center.lng], zoom });
      this.fetchAircraftData();
    });

    this.map.on('postrender', this.animateFlights); // Add postrender event listener
    this.initDrawControl();
    this.fetchAircraftData();
  }

  componentWillUnmount() {
    this.map.off('moveend');
    this.map.off('postrender');
    this.map = null;
  }

  initDrawControl = () => {
    this.rectangleLayer = new L.FeatureGroup();
    this.map.addLayer(this.rectangleLayer);

    const drawControl = new L.Control.Draw({
      draw: {
        rectangle: true,
        polyline: false,
        circle: false,
        circlemarker: false,
        marker: false,
        polygon: false,
      },
      edit: {
        featureGroup: this.rectangleLayer,
        remove: true,
      },
    });

    this.map.addControl(drawControl);
    this.map.on(L.Draw.Event.CREATED, this.onDrawCreated);
  };

  onDrawCreated = (event) => {
    const { layer } = event;
    this.rectangleLayer.addLayer(layer);
    this.rectangle = layer;
    this.updateBboxCoordinates();

    const bbox = this.getBoundingBox();
    if (bbox) {
      this.map.fitBounds([[bbox.south, bbox.west], [bbox.north, bbox.east]]);
    }

    this.fetchAircraftData();
  };

  updateBboxCoordinates = () => {
    const bboxCoordinates = this.rectangle
      ? this.rectangle.getLatLngs()[0].map((latLng) => [latLng.lat, latLng.lng])
      : [];
    this.setState({ bboxCoordinates }, () => {
      const bbox = this.getBoundingBox();
      if (bbox) {
        console.log('Bounding Box:', bbox);
      }
    });
  };

  getBoundingBox = () => {
    const { bboxCoordinates } = this.state;
    if (bboxCoordinates.length === 0) {
      return null;
    }

    const west = bboxCoordinates[0][1];
    const south = bboxCoordinates[0][0];
    const east = bboxCoordinates[2][1];
    const north = bboxCoordinates[2][0];

    if (!Number.isFinite(west) || !Number.isFinite(south) || !Number.isFinite(east) || !Number.isFinite(north)) {
      return null;
    }

    return { west, south, east, north };
  };

  fetchAircraftData = () => {
    const bbox = this.getBoundingBox();
    if (!bbox) {
      return;
    }
    const url = `http://127.0.0.1:5000/aircraft?bbox=${bbox.west},${bbox.south},${bbox.east},${bbox.north}`;
  
    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        this.updateAircraftMarkers(data);
        this.drawFlightPaths(data);
      })
      .catch((error) => console.error('Error:', error));
  };
  

  updateAircraftMarkers = (aircraftData) => {
    if (this.airplaneLayer) {
      this.map.removeLayer(this.airplaneLayer);
    }

    this.airplaneLayer = L.layerGroup().addTo(this.map);

    const bbox = this.getBoundingBox();

    aircraftData.forEach((aircraft) => {
      const [icao24, lat, lon, altitude, heading] = aircraft;
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return;
      }

      // Check if the aircraft is within the bounding box
      if (lat >= bbox.south && lat <= bbox.north && lon >= bbox.west && lon <= bbox.east) {
        L.marker([lat, lon], { icon: this.airplaneIcon })
          .addTo(this.airplaneLayer)
          .bindPopup(icao24);
      }
    });
  };

  drawFlightPaths = (flightData) => {
    if (!flightData || !flightData.length) {
      return;
    }
  
    const bbox = this.getBoundingBox();
  
    const polylines = [];
  
    flightData.forEach((flight) => {
      const [icao24, lat1, lon1, lat2, lon2] = flight;
      if (!Number.isFinite(lat1) || !Number.isFinite(lon1) || !Number.isFinite(lat2) || !Number.isFinite(lon2)) {
        return;
      }
  
      // Periksa apakah koordinat penerbangan berada dalam kotak pembatas
      if (
        (lat1 >= bbox.south && lat1 <= bbox.north && lon1 >= bbox.west && lon1 <= bbox.east) ||
        (lat2 >= bbox.south && lat2 <= bbox.north && lon2 >= bbox.west && lon2 <= bbox.east)
      ) {
        const polyline = L.polyline([[lat1, lon1], [lat2, lon2]], { color: 'blue' });
        polylines.push(polyline);
      }
    });
  
    const decorator = L.polylineDecorator(polylines, {
      patterns: [
        {
          offset: '50%',
          symbol: L.Symbol.arrowHead({
            pixelSize: 10,
            polygon: false,
            pathOptions: { color: 'blue' },
          }),
        },
      ],
    });
  
    decorator.addTo(this.map);
  };

  animateFlights = () => {
    const context = this.map._renderer._container.getContext('2d');
    const vectorContext = L.canvas({ padding: 0 });
  
    // Clear the canvas
    context.clearRect(0, 0, this.map._renderer._container.width, this.map._renderer._container.height);
  
    const bbox = this.getBoundingBox(); // Tambahkan deklarasi bbox di sini
  
    // Loop through flight data and animate flights
    this.flightData.forEach((flight) => {
      const [icao24, lat1, lon1, lat2, lon2] = flight;
      if (!Number.isFinite(lat1) || !Number.isFinite(lon1) || !Number.isFinite(lat2) || !Number.isFinite(lon2)) {
        return;
      }
  
      // Check if the flight coordinates are within the bounding box
      if (
        (lat1 >= bbox.south && lat1 <= bbox.north && lon1 >= bbox.west && lon1 <= bbox.east) ||
        (lat2 >= bbox.south && lat2 <= bbox.north && lon2 >= bbox.west && lon2 <= bbox.east)
      ) {
        // Get the projected coordinates
        const p1 = this.map.latLngToLayerPoint([lat1, lon1]);
        const p2 = this.map.latLngToLayerPoint([lat2, lon2]);
  
        // Calculate the animation progress
        const progress = (Date.now() % 10000) / 10000;
  
        // Calculate the current position
        const x = p1.x + (p2.x - p1.x) * progress;
        const y = p1.y + (p2.y - p1.y) * progress;
  
        // Draw the airplane icon at the current position
        vectorContext.clearRect(0, 0, this.map._renderer._container.width, this.map._renderer._container.height);
        vectorContext.drawImage(this.airplaneIcon._image, x, y, 32, 32);
  
        // Render the vector layer
        this.map._renderer._renderPath(vectorContext);
      }
    });
  };

  render() {
    const { bboxCoordinates } = this.state;

    return (
      <div className="map-container">
        <div ref={this.mapRef} className="map" />
        <div className="bbox-coordinates">
          {bboxCoordinates.length > 0 && (
            <React.Fragment>
              <span>Bbox Coordinates:</span>
              {bboxCoordinates.map((coord, index) => (
                <span key={index}>
                  [{coord[0].toFixed(2)}, {coord[1].toFixed(2)}]
                </span>
              ))}
            </React.Fragment>
          )}
        </div>
      </div>
    );
  }
}

export default MapComponent2;
