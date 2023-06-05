import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet';
import 'leaflet-draw';
import 'leaflet-polylinedecorator/dist/leaflet.polylineDecorator.js';
import '../LeafletMaps/Map2.css';
import React from 'react';
import L from 'leaflet';
import 'leaflet-draw/dist/leaflet.draw.css';

class MapComponent2 extends React.Component {
  map = null;
  mapBounds = null;
  aircraftLayer = null;
  aircraftMovementLayer = null;
  drawnItems = null;
  drawControl = null;

  copyBoundingBoxCoordinates = () => {
    const bboxCoordinatesElement = document.getElementById('bbox-coordinates');
    const bboxCoordinates = bboxCoordinatesElement.textContent;

    navigator.clipboard
      .writeText(bboxCoordinates)
      .then(() => {
        alert('Koordinat berhasil disalin!');
      })
      .catch((error) => {
        console.error('Error:', error);
      });
  };

  componentDidMount() {
    this.initializeMap();
  }

  initializeMap() {
    this.map = L.map('map').setView([0, 0], 2);
    this.mapBounds = L.latLngBounds();

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: 'Map data &copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(this.map);

    this.aircraftLayer = L.layerGroup().addTo(this.map);
    this.aircraftMovementLayer = L.layerGroup().addTo(this.map);

    this.drawnItems = new L.FeatureGroup();
    this.map.addLayer(this.drawnItems);

    this.drawControl = new L.Control.Draw({
      draw: {
        rectangle: true,
        polyline: false,
        circle: false,
        circlemarker: false,
        marker: false,
        polygon: false,
      },
      edit: {
        featureGroup: this.drawnItems,
        remove: true,
      },
    });
    this.map.addControl(this.drawControl);

    this.map.on('draw:created', this.drawCreatedHandler);
    this.map.on('draw:deleted', this.drawDeletedHandler);
  }

  drawCreatedHandler = (event) => {
    this.drawnItems.clearLayers();

    const layer = event.layer;
    this.drawnItems.addLayer(layer);
    const bounds = layer.getBounds();
    this.showBoundingBoxCoordinates(bounds);
    this.map.fitBounds(bounds);
  };

  drawDeletedHandler = (event) => {
    const layers = event.layers;
    layers.eachLayer((layer) => {
      this.drawnItems.removeLayer(layer);
      this.aircraftMovementLayer.clearLayers();
    });

    const bboxCoordinatesElement = document.getElementById('bbox-coordinates');
    bboxCoordinatesElement.innerHTML = '';
  };

  showBoundingBoxCoordinates = (bounds) => {


    const bboxCoordinatesElement = document.getElementById('bbox-coordinates');
    bboxCoordinatesElement.innerHTML = `${bounds.toBBoxString()}`;

    const layer = L.rectangle(bounds);
    layer.bindPopup(`BBox: ${bounds.toBBoxString()}`).openPopup();
    this.drawnItems.addLayer(layer);

    this.mapBounds.extend(bounds);
  };

  updateAircraftPositions = (bounds) => {
    fetch('/aircraft')
      .then((response) => response.json())
      .then((data) => {
        this.aircraftLayer.clearLayers();

        data.forEach((aircraft) => {
          const icao24 = aircraft[0];
          const latitude = aircraft[1];
          const longitude = aircraft[2];
          const altitude = aircraft[3];
          const heading = aircraft[4];

          if (latitude !== null) {
            if (
              bounds &&
              latitude >= bounds.getSouthWest().lat &&
              latitude <= bounds.getNorthEast().lat &&
              longitude >= bounds.getSouthWest().lng &&
              longitude <= bounds.getNorthEast().lng
            ) {
              const marker = L.marker([latitude, longitude]).addTo(this.aircraftLayer);

              marker.on('click', () => {
                const popupContent = `
                  <strong>ICAO24:</strong> ${icao24}<br>
                  <strong>Latitude:</strong> ${latitude}<br>
                  <strong>Longitude:</strong> ${longitude}<br>
                  <strong>Altitude:</strong> ${altitude}<br>
                  <button class="button button-show" onclick="showAircraftMovement('${icao24}', ${latitude}, ${longitude}, ${heading})">Tampilkan Gerakan</button>
                `;
                marker.bindPopup(popupContent).openPopup();
              });
            }
          }
        });
      })
      .catch((error) => console.error('Error:', error));
  };

  componentWillUnmount() {
    this.map.off('draw:created', this.drawCreatedHandler);
    this.map.off('draw:deleted', this.drawDeletedHandler);
  }

  render() {
    return (
      <div>
        <div id="map" className="map2"></div>

        <div className="bbox-result">
          <strong>Hasil Koordinat Bbox:</strong>
          <span id="bbox-coordinates"></span>
          <br />
          <button id="copy-button" onClick={this.copyBoundingBoxCoordinates}>
            Salin
          </button>
        </div>
      </div>
    );
  }
}

export default MapComponent2;