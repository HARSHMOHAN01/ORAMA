import React, { useState } from 'react';
import { Trash2, Search, Cpu, Calendar, Navigation, AlertCircle, Filter } from 'lucide-react';

const PotholeTable = ({ potholes, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [deviceFilter, setDeviceFilter] = useState('ALL');

  // Filter logic
  const filteredPotholes = potholes.filter(p => {
    const matchesSearch = 
      p.device_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.address || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toString().includes(searchTerm);
      
    const matchesStatus = statusFilter === 'ALL' || p.status.toUpperCase() === statusFilter;
    const matchesSeverity = severityFilter === 'ALL' || (p.severity || 'MEDIUM').toUpperCase() === severityFilter;
    const matchesDevice = deviceFilter === 'ALL' || p.device_id === deviceFilter;
    
    return matchesSearch && matchesStatus && matchesSeverity && matchesDevice;
  });

  const formatTimestamp = (tsString) => {
    try {
      const parts = tsString.split(' ');
      if (parts.length >= 2) {
        return parts[1]; // Time part
      }
      return tsString;
    } catch {
      return tsString;
    }
  };

  const getSeverityBadgeClass = (severity) => {
    const sev = (severity || 'MEDIUM').toUpperCase();
    if (sev === 'HIGH') return 'severity-badge high';
    if (sev === 'LOW') return 'severity-badge low';
    return 'severity-badge medium';
  };

  return (
    <div className="section-card table-section" style={{ minWidth: '100%' }}>
      <div className="section-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="section-title">
            <Cpu className="text-primary" size={18} />
            <span>Pothole Logs & Search</span>
          </h2>
          <span className="map-badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-primary)' }}>
            {filteredPotholes.length} Records Found
          </span>
        </div>

        {/* Advanced Filter Controls */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
          gap: '12px',
          background: 'rgba(15, 23, 42, 0.4)',
          padding: '12px',
          borderRadius: '10px',
          border: '1px solid var(--border-glass)'
        }}>
          {/* Text Search */}
          <div className="search-wrapper" style={{ margin: 0, width: '100%' }}>
            <Search className="search-icon" size={14} />
            <input 
              type="text" 
              placeholder="Search ID, device, address..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              style={{ paddingLeft: '32px' }}
            />
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={12} className="text-muted" />
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                background: '#0f172a',
                border: '1px solid var(--border-glass)',
                color: '#fff',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                width: '100%',
                outline: 'none'
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="POTHOLE">Active Potholes</option>
              <option value="FILLED">Repaired / Filled</option>
            </select>
          </div>

          {/* Severity Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={12} className="text-muted" />
            <select 
              value={severityFilter} 
              onChange={(e) => setSeverityFilter(e.target.value)}
              style={{
                background: '#0f172a',
                border: '1px solid var(--border-glass)',
                color: '#fff',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                width: '100%',
                outline: 'none'
              }}
            >
              <option value="ALL">All Severities</option>
              <option value="HIGH">High Severity</option>
              <option value="MEDIUM">Medium Severity</option>
              <option value="LOW">Low Severity</option>
            </select>
          </div>

          {/* Device Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={12} className="text-muted" />
            <select 
              value={deviceFilter} 
              onChange={(e) => setDeviceFilter(e.target.value)}
              style={{
                background: '#0f172a',
                border: '1px solid var(--border-glass)',
                color: '#fff',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                width: '100%',
                outline: 'none'
              }}
            >
              <option value="ALL">All Devices</option>
              <option value="A001">Device A001</option>
              <option value="A002">Device A002</option>
              <option value="A003">Device A003</option>
              <option value="A004">Device A004</option>
            </select>
          </div>
        </div>
      </div>

      <div className="table-responsive" style={{ maxHeight: '350px', overflowY: 'auto' }}>
        <table className="pothole-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Device</th>
              <th>Location Address</th>
              <th>Severity</th>
              <th>Time</th>
              <th>Status</th>
              <th className="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPotholes.map((p) => (
              <tr key={p.id} className="table-row-animate">
                <td className="id-cell">#{p.id}</td>
                <td>
                  <span className="device-badge">
                    <Cpu size={12} />
                    <span>{p.device_id}</span>
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontWeight: 500, fontSize: '13px' }}>{p.address || 'Reverse geocoding...'}</span>
                    <span className="coordinate-cell" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      GPS: {p.latitude.toFixed(5)}, {p.longitude.toFixed(5)}
                    </span>
                  </div>
                </td>
                <td>
                  <span className={getSeverityBadgeClass(p.severity)}>
                    {(p.severity || 'MEDIUM').toUpperCase()}
                  </span>
                </td>
                <td>
                  <span className="time-badge">
                    <Calendar size={12} />
                    <span>{formatTimestamp(p.timestamp)}</span>
                  </span>
                </td>
                <td>
                  <span className={`status-badge-react ${p.status.toLowerCase()}`}>
                    {p.status}
                  </span>
                </td>
                <td className="actions-col">
                  <button 
                    onClick={() => onDelete(p.id)} 
                    className="delete-action-btn"
                    title="Delete record"
                  >
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </button>
                </td>
              </tr>
            ))}
            {filteredPotholes.length === 0 && (
              <tr>
                <td colSpan="7" className="empty-table-row">
                  No records match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PotholeTable;
