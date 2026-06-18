import React from 'react';
import { Cpu, Navigation, MapPin, Truck, Award } from 'lucide-react';

const CrewRouting = ({ crews }) => {
  return (
    <div className="section-card routing-section">
      <div className="section-header">
        <h2 className="section-title">
          <Truck className="text-primary" size={18} />
          <span>AI Maintenance Dispatch & Route Planner</span>
        </h2>
        <span className="map-badge">3 Dispatch Crews Active</span>
      </div>

      <div className="crews-grid">
        {crews && crews.map((crew) => (
          <div key={crew.id} className="crew-card" style={{ borderLeft: `4px solid ${crew.color}` }}>
            <div className="crew-card-header">
              <div className="crew-meta">
                <Truck size={18} style={{ color: crew.color }} />
                <h3>{crew.name}</h3>
              </div>
              <span className="route-distance-badge">
                {crew.total_distance_km} km route
              </span>
            </div>

            <div className="crew-depot-info">
              <MapPin size={12} className="text-muted" />
              <span>Depot: {crew.depot[0].toFixed(4)}, {crew.depot[1].toFixed(4)}</span>
            </div>

            <div className="route-stops-list">
              {crew.potholes.length === 0 ? (
                <div className="empty-route">
                  <Award size={18} className="text-muted" />
                  <p>No active potholes in this sector.</p>
                </div>
              ) : (
                crew.potholes.map((stop, index) => (
                  <div key={stop.id} className="route-stop-item">
                    <div className="stop-number" style={{ backgroundColor: `${crew.color}20`, color: crew.color }}>
                      {index + 1}
                    </div>
                    <div className="stop-details">
                      <div className="stop-header">
                        <span className="stop-device">{stop.device_id}</span>
                        <span className={`stop-severity ${stop.severity.toLowerCase()}`}>
                          {stop.severity}
                        </span>
                      </div>
                      <p className="stop-address">{stop.address || "Fetching address..."}</p>
                      <div className="stop-footer">
                        <span className="stop-coords">{stop.latitude.toFixed(5)}, {stop.longitude.toFixed(5)}</span>
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${stop.latitude},${stop.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="navigation-link"
                        >
                          <Navigation size={10} />
                          <span>Google Maps</span>
                        </a>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {crew.potholes.length > 0 && (
              <button 
                className="dispatch-btn" 
                style={{ backgroundColor: crew.color }}
                onClick={() => alert(`Route coordinates dispatched to ${crew.name} navigation interface!`)}
              >
                Dispatch Route
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CrewRouting;
