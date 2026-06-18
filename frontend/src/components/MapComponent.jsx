import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation } from 'lucide-react';

// Custom glowing marker icon using SVG
const createGlowingMarker = (device_id, status, severity) => {
  const isFilled = status === 'FILLED';
  let pulseClass = 'glowing-pulse';
  let markerIcon = '📍';
  
  if (isFilled) {
    pulseClass = 'glowing-pulse filled';
    markerIcon = '✅';
  } else {
    const sev = (severity || 'MEDIUM').toUpperCase();
    if (sev === 'HIGH') {
      pulseClass = 'glowing-pulse high';
      markerIcon = '🔴';
    } else if (sev === 'LOW') {
      pulseClass = 'glowing-pulse low';
      markerIcon = '🟡';
    } else {
      pulseClass = 'glowing-pulse medium';
      markerIcon = '🟠';
    }
  }
  return new L.DivIcon({
    html: `
      <div class="custom-marker-wrapper">
        <div class="${pulseClass}"></div>
        <div class="marker-core">${markerIcon}</div>
      </div>
    `,
    className: 'custom-marker-container',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

// Component to dynamically re-center map when potholes array changes or is clicked
const RecenterMap = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 14, { animate: true, duration: 1.5 });
    }
  }, [center, map]);
  return null;
};

const MapComponent = ({ potholes, crewRoutes, showHeatmap }) => {
  const defaultCenter = [29.865, 77.896]; // Base Roorkee coordinates
  
  // Cap markers to the latest 15 records to keep the map fast and light
  const displayPotholes = potholes.slice(0, 15);
  
  // Find the center: either the latest pothole, or default center
  const center = displayPotholes.length > 0 
    ? [displayPotholes[0].latitude, displayPotholes[0].longitude] 
    : defaultCenter;

  return (
    <div className="section-card map-section">
      <div className="section-header">
        <h2 className="section-title">
          <Navigation className="text-red animate-pulse" size={18} />
          <span>Live Pothole Map Tracker</span>
        </h2>
        <span className="map-badge">
          {displayPotholes.length} Markers Placed
        </span>
      </div>

      <div className="map-wrapper">
        <MapContainer 
          center={defaultCenter} 
          zoom={13} 
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%', borderRadius: '12px' }}
        >
          {/* Using dark theme tile layer from CartoDB which matches our dashboard dark mode */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {showHeatmap && displayPotholes.map((p) => {
            if (p.status === 'FILLED') return null;
            const color = p.severity === 'HIGH' ? '#ef4444' : p.severity === 'MEDIUM' ? '#f59e0b' : '#facc15';
            return (
              <Circle
                key={`heat-${p.id}`}
                center={[p.latitude, p.longitude]}
                radius={200}
                pathOptions={{
                  fillColor: color,
                  color: 'transparent',
                  fillOpacity: 0.25
                }}
              />
            );
          })}
          
          {displayPotholes.map((p) => (
            <Marker 
              key={p.id} 
              position={[p.latitude, p.longitude]}
              icon={createGlowingMarker(p.device_id, p.status, p.severity)}
            >
              <Popup>
                <div className="map-popup-content">
                  <h4>Pothole Detected!</h4>
                  <p><strong>Device:</strong> {p.device_id}</p>
                  <p><strong>Location:</strong> {p.address || "Fetching address..."}</p>
                  <p><strong>Time:</strong> {p.timestamp}</p>
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${p.latitude},${p.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="popup-nav-link"
                    style={{ 
                      color: '#3b82f6', 
                      textDecoration: 'underline', 
                      fontSize: '11px', 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '4px',
                      marginTop: '6px',
                      fontWeight: '600'
                    }}
                  >
                    <span>View on Google Maps</span>
                  </a>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Render crew route polylines */}
          {crewRoutes && crewRoutes.map((crew) => {
            if (crew.potholes.length === 0) return null;
            const path = [
              crew.depot,
              ...crew.potholes.map(p => [p.latitude, p.longitude]),
              crew.depot
            ];
            return (
              <Polyline 
                key={crew.id}
                positions={path}
                pathOptions={{ 
                  color: crew.color, 
                  weight: 3.5, 
                  dashArray: '8, 8', 
                  opacity: 0.85 
                }}
              />
            );
          })}

          <RecenterMap center={center} />
        </MapContainer>
      </div>
    </div>
  );
};

export default MapComponent;
