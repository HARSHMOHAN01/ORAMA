import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import MapComponent from '../components/MapComponent';
import PotholeTable from '../components/PotholeTable';
import CrewRouting from '../components/CrewRouting';
import { getPotholes, getStats, deletePothole, getPotholeRoutes } from '../services/api';
import socket from '../services/socket';
import { 
  ShieldAlert, Info, Bell, Trash2, CheckCircle2, 
  Map, BarChart2, Radio, Wrench, AlertTriangle, FileText, Download, Play 
} from 'lucide-react';

const Dashboard = () => {
  const [potholes, setPotholes] = useState([]);
  const [stats, setStats] = useState({
    total_potholes: 0,
    active_devices: 0,
    latest_detection: 'N/A',
    today_potholes: 0,
    week_potholes: 0,
    resolved_potholes: 0,
    unresolved_potholes: 0,
    severity_high: 0,
    severity_medium: 0,
    severity_low: 0,
    avg_response_time: 45
  });
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [notifications, setNotifications] = useState([]);
  const [crewRoutes, setCrewRoutes] = useState([]);
  
  // Navigation tabs state
  const [mainTab, setMainTab] = useState('tracking'); // 'tracking' | 'analytics' | 'devices' | 'tickets' | 'risk' | 'reports'
  const [subTab, setSubTab] = useState('history'); // 'history' | 'routing' for Operations tracking tab
  const [showHeatmap, setShowHeatmap] = useState(false); // Map heatmap overlay state

  // Format SQLite timestamp (YYYY-MM-DD HH:MM:SS) to HH:MM:SS
  const formatTimestamp = (tsString) => {
    try {
      const parts = tsString.split(' ');
      if (parts.length >= 2) {
        return parts[1]; 
      }
      return tsString;
    } catch {
      return tsString;
    }
  };

  // Fetch initial data
  const loadInitialData = async () => {
    try {
      const history = await getPotholes();
      setPotholes(history.slice(0, 50)); // Cap to latest 50 records

      const currentStats = await getStats();
      setStats({
        ...currentStats,
        latest_detection: currentStats.latest_detection 
          ? formatTimestamp(currentStats.latest_detection)
          : 'N/A'
      });

      const routesData = await getPotholeRoutes();
      setCrewRoutes(routesData.crews);
    } catch (err) {
      console.error('Failed to load initial data from backend API:', err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Set up WebSocket listeners
  useEffect(() => {
    const onConnect = () => {
      setIsConnected(true);
      console.log('Socket.IO Connected!');
    };

    const onDisconnect = () => {
      setIsConnected(false);
      console.log('Socket.IO Disconnected!');
    };

    const onNewPothole = (data) => {
      console.log('New pothole websocket event received:', data);
      
      // Play sound alert
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // 880 Hz beep
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.15); // Beep for 0.15s
      } catch (err) {
        console.warn('Audio context blocked by browser autoplay policy:', err);
      }

      // Add to potholes list (at the top), capping to 50 items
      setPotholes((prev) => [data, ...prev].slice(0, 50));

      // Refresh Stats & Routing
      getStats().then(setStats).catch(console.error);
      getPotholeRoutes()
        .then((res) => setCrewRoutes(res.crews))
        .catch((err) => console.error('Failed to update routes on websocket:', err));

      // Add to notification toasts stack
      const newNotification = {
        id: Date.now(),
        device_id: data.device_id,
        latitude: data.latitude,
        longitude: data.longitude,
        time: formatTimestamp(data.timestamp)
      };

      setNotifications((prev) => [newNotification, ...prev]);

      // Auto-remove notification after 5 seconds
      setTimeout(() => {
        setNotifications((prev) => prev.filter(n => n.id !== newNotification.id));
      }, 5000);
    };

    const onUpdatePothole = (updatedData) => {
      console.log('Pothole status update received:', updatedData);
      
      // Update history list in-place
      setPotholes((prev) => prev.map((p) => (p.id === updatedData.id ? updatedData : p)));
      
      // Refresh Stats & Routing
      getStats().then(setStats).catch(console.error);
      getPotholeRoutes()
        .then((res) => setCrewRoutes(res.crews))
        .catch((err) => console.error('Failed to update routes on websocket update:', err));
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('new_pothole', onNewPothole);
    socket.on('update_pothole', onUpdatePothole);

    // Initial connection checks
    if (socket.connected) {
      setIsConnected(true);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('new_pothole', onNewPothole);
      socket.off('update_pothole', onUpdatePothole);
    };
  }, [potholes]);

  // Handle delete action
  const handleDelete = async (id) => {
    if (window.confirm(`Are you sure you want to delete record #${id}?`)) {
      try {
        await deletePothole(id);
        
        // Remove from state
        const updatedPotholes = potholes.filter((p) => p.id !== id);
        setPotholes(updatedPotholes);
        
        // Refresh Stats & Routing
        getStats().then(setStats).catch(console.error);
        const routesData = await getPotholeRoutes();
        setCrewRoutes(routesData.crews);
      } catch (err) {
        console.error('Failed to delete record:', err);
      }
    }
  };

  // Handle status update
  const handleStatusChange = async (id, nextStatus) => {
    try {
      const response = await fetch(`http://localhost:5000/pothole/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await response.json();
      if (data.success) {
        setPotholes(prev => prev.map(p => p.id === id ? { ...p, status: nextStatus } : p));
        getStats().then(setStats).catch(console.error);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Trigger simulated device pothole detection
  const handleTriggerDevice = async (deviceId) => {
    try {
      const response = await fetch('http://localhost:5000/pothole', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId, status: 'POTHOLE' })
      });
      const data = await response.json();
      if (data.success) {
        alert(`Mock detection triggered successfully for Device ${deviceId}!`);
        loadInitialData();
      }
    } catch (err) {
      console.error(err);
      alert('Failed to trigger mock device alert.');
    }
  };

  // Export report to CSV
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID,Device ID,Latitude,Longitude,Address,Severity,Priority,Status,Timestamp\n";
    potholes.forEach(p => {
      csvContent += `${p.id},${p.device_id},${p.latitude},${p.longitude},"${p.address || ''}",${p.severity || 'MEDIUM'},${p.priority || 'NORMAL'},${p.status},${p.timestamp}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `pothole_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    alert('Report downloaded successfully!');
  };

  return (
    <div className="dashboard-container">
      <Navbar isConnected={isConnected} />
      
      {/* Toast Notification Container */}
      <div className="notification-toast-container">
        {notifications.map((n) => (
          <div key={n.id} className="notification-toast animate-slide-in">
            <ShieldAlert size={20} className="toast-icon text-red" />
            <div className="toast-body">
              <h4>New Pothole Detected</h4>
              <p>Device <strong>{n.device_id}</strong> triggers detection alert.</p>
              <span className="toast-coords">GPS: {n.latitude.toFixed(4)}, {n.longitude.toFixed(4)}</span>
            </div>
            <span className="toast-time">{n.time}</span>
          </div>
        ))}
      </div>

      <main className="dashboard-content">
        {/* Main Tab selector */}
        <div className="main-tabs-bar">
          <button 
            className={`main-tab-link ${mainTab === 'tracking' ? 'active' : ''}`}
            onClick={() => setMainTab('tracking')}
          >
            <Map size={16} />
            <span>Operations Map</span>
          </button>
          <button 
            className={`main-tab-link ${mainTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setMainTab('analytics')}
          >
            <BarChart2 size={16} />
            <span>Analytics & Trends</span>
          </button>
          <button 
            className={`main-tab-link ${mainTab === 'devices' ? 'active' : ''}`}
            onClick={() => setMainTab('devices')}
          >
            <Radio size={16} />
            <span>IoT Devices</span>
          </button>
          <button 
            className={`main-tab-link ${mainTab === 'tickets' ? 'active' : ''}`}
            onClick={() => setMainTab('tickets')}
          >
            <Wrench size={16} />
            <span>Maintenance Tickets</span>
          </button>
          <button 
            className={`main-tab-link ${mainTab === 'risk' ? 'active' : ''}`}
            onClick={() => setMainTab('risk')}
          >
            <AlertTriangle size={16} />
            <span>AI Risk Assessment</span>
          </button>
          <button 
            className={`main-tab-link ${mainTab === 'reports' ? 'active' : ''}`}
            onClick={() => setMainTab('reports')}
          >
            <FileText size={16} />
            <span>Reports & Exports</span>
          </button>
        </div>

        {/* Tab content rendering */}
        {mainTab === 'tracking' && (
          <>
            {/* Statistics Cards */}
            <section className="stats-row">
              <div className="dashboard-stat-card glow-red">
                <div className="card-header">
                  <ShieldAlert className="stat-card-icon text-red" />
                  <span className="stat-card-title">Total Detections</span>
                </div>
                <h2 className="stat-card-value text-red">{stats.total_potholes || potholes.length}</h2>
              </div>

              <div className="dashboard-stat-card glow-blue">
                <div className="card-header">
                  <CheckCircle2 className="stat-card-icon text-blue" />
                  <span className="stat-card-title">Devices Active</span>
                </div>
                <h2 className="stat-card-value text-blue">{stats.active_devices || 4}</h2>
              </div>

              <div className="dashboard-stat-card glow-amber">
                <div className="card-header">
                  <Bell className="stat-card-icon text-amber" />
                  <span className="stat-card-title">Latest Detection</span>
                </div>
                <h2 className="stat-card-value text-amber">{stats.latest_detection || 'N/A'}</h2>
              </div>
            </section>

            {/* Map and Alerts Grid */}
            <section className="main-grid">
              <MapComponent potholes={potholes} crewRoutes={crewRoutes} showHeatmap={showHeatmap} />

              {/* Recent Live Alert Log Panel */}
              <div className="section-card alerts-section">
                <div className="section-header">
                  <h2 className="section-title">
                    <Bell size={18} className="text-amber" />
                    <span>Recent Live Alerts</span>
                  </h2>
                </div>
                <div className="alerts-list">
                  {potholes.slice(0, 5).map((p) => (
                    <div key={p.id} className="alert-item">
                      <div className="alert-badge text-red">
                        <ShieldAlert size={14} />
                        <span>POTHOLE</span>
                      </div>
                      <div className="alert-info">
                        <p><strong>{p.device_id}</strong> detected pothole</p>
                        <span className="alert-time">{formatTimestamp(p.timestamp)}</span>
                      </div>
                    </div>
                  ))}
                  {potholes.length === 0 && (
                    <div className="empty-alerts">
                      <Info size={24} className="text-muted" />
                      <p>Waiting for incoming sensor streams...</p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Sub Tabs */}
            <div className="tabs-bar">
              <button 
                className={`tab-link ${subTab === 'history' ? 'active' : ''}`}
                onClick={() => setSubTab('history')}
              >
                History Log
              </button>
              <button 
                className={`tab-link ${subTab === 'routing' ? 'active' : ''}`}
                onClick={() => setSubTab('routing')}
              >
                AI Crew Dispatch Planner
              </button>
            </div>

            <section className="table-row">
              {subTab === 'history' ? (
                <PotholeTable potholes={potholes} onDelete={handleDelete} />
              ) : (
                <CrewRouting crews={crewRoutes} />
              )}
            </section>
          </>
        )}

        {mainTab === 'analytics' && (
          <section className="charts-grid animate-slide-in">
            {/* Stats Row summary cards */}
            <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <div className="dashboard-stat-card glow-red">
                <span className="stat-card-title">Today's Potholes</span>
                <h2 className="stat-card-value text-red">{stats.today_potholes || 2}</h2>
              </div>
              <div className="dashboard-stat-card glow-amber">
                <span className="stat-card-title">This Week's Potholes</span>
                <h2 className="stat-card-value text-amber">{stats.week_potholes || potholes.length}</h2>
              </div>
              <div className="dashboard-stat-card glow-blue">
                <span className="stat-card-title">Resolved vs Unresolved</span>
                <h2 className="stat-card-value text-blue">{stats.resolved_potholes}/{stats.unresolved_potholes}</h2>
              </div>
              <div className="dashboard-stat-card glow-primary">
                <span className="stat-card-title">Avg Response Time</span>
                <h2 className="stat-card-value" style={{ color: 'var(--color-success)' }}>{stats.avg_response_time || 45} hrs</h2>
              </div>
            </div>

            {/* Severity Custom Chart */}
            <div className="chart-card">
              <h3 className="section-title">Severity Breakdown</h3>
              <div className="chart-container">
                <div className="bar-wrapper">
                  <div className="bar-column" style={{ height: `${(stats.severity_high / Math.max(stats.total_potholes, 1)) * 100 || 30}%`, background: 'var(--color-red)' }}>
                    <span className="bar-tooltip">High: {stats.severity_high || 2}</span>
                  </div>
                  <span className="chart-label">High</span>
                </div>
                <div className="bar-wrapper">
                  <div className="bar-column" style={{ height: `${(stats.severity_medium / Math.max(stats.total_potholes, 1)) * 100 || 50}%`, background: 'var(--color-amber)' }}>
                    <span className="bar-tooltip">Medium: {stats.severity_medium || 4}</span>
                  </div>
                  <span className="chart-label">Medium</span>
                </div>
                <div className="bar-wrapper">
                  <div className="bar-column" style={{ height: `${(stats.severity_low / Math.max(stats.total_potholes, 1)) * 100 || 20}%`, background: '#facc15' }}>
                    <span className="bar-tooltip">Low: {stats.severity_low || 1}</span>
                  </div>
                  <span className="chart-label">Low</span>
                </div>
              </div>
            </div>

            {/* Device Detections Custom Chart */}
            <div className="chart-card">
              <h3 className="section-title">Detections by Device Sensor</h3>
              <div className="chart-container">
                {['A001', 'A002', 'A003', 'A004'].map((d) => {
                  const count = potholes.filter(p => p.device_id === d).length || 2;
                  const max = Math.max(potholes.length, 1);
                  const h = (count / max) * 100;
                  return (
                    <div key={d} className="bar-wrapper">
                      <div className="bar-column" style={{ height: `${h}%`, background: 'var(--color-primary)' }}>
                        <span className="bar-tooltip">{d}: {count}</span>
                      </div>
                      <span className="chart-label">{d}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {mainTab === 'devices' && (
          <section className="device-grid animate-slide-in">
            {[
              { id: 'A001', status: 'ONLINE', battery: 92, rssi: -62 },
              { id: 'A002', status: 'ONLINE', battery: 84, rssi: -70 },
              { id: 'A003', status: 'ONLINE', battery: 73, rssi: -68 },
              { id: 'A004', status: 'OFFLINE', battery: 12, rssi: -95 }
            ].map((device) => (
              <div key={device.id} className="device-card">
                <div className="device-header">
                  <div className="device-title">
                    <Radio size={16} className={device.status === 'ONLINE' ? 'text-blue' : 'text-muted'} />
                    <span>IoT Sensor node {device.id}</span>
                  </div>
                  <span className={`device-status ${device.status.toLowerCase()}`}>
                    {device.status}
                  </span>
                </div>
                
                <div className="device-stat-item">
                  <span className="device-stat-label">Battery Charge</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="device-battery-bar">
                      <div 
                        className="device-battery-fill" 
                        style={{ 
                          width: `${device.battery}%`, 
                          background: device.battery > 50 ? 'var(--color-success)' : device.battery > 20 ? 'var(--color-amber)' : 'var(--color-red)'
                        }}
                      ></div>
                    </div>
                    <span className="device-stat-value">{device.battery}%</span>
                  </div>
                </div>

                <div className="device-stat-item">
                  <span className="device-stat-label">Signal Strength (RSSI)</span>
                  <span className="device-stat-value" style={{ color: device.rssi > -75 ? 'var(--color-success)' : 'var(--color-red)' }}>
                    {device.rssi} dBm
                  </span>
                </div>

                <div className="device-stat-item">
                  <span className="device-stat-label">Module Type</span>
                  <span className="device-stat-value">ESP32 + ADXL345</span>
                </div>

                <button 
                  onClick={() => handleTriggerDevice(device.id)}
                  className="device-action-btn"
                >
                  <Play size={12} />
                  <span>Trigger Mock Alert</span>
                </button>
              </div>
            ))}
          </section>
        )}

        {mainTab === 'tickets' && (
          <section className="tickets-list animate-slide-in">
            <div className="section-card">
              <h2 className="section-title">
                <Wrench size={18} className="text-primary" />
                <span>Municipal Repair Tickets Dispatch</span>
              </h2>
              <div className="tickets-list" style={{ marginTop: '16px' }}>
                {potholes.map((p) => (
                  <div key={p.id} className="ticket-card">
                    <div className="ticket-info">
                      <span className="ticket-id">#TKT-{p.id}</span>
                      <span className="ticket-address">{p.address || 'Civil Lines Road, Roorkee'}</span>
                      <div className="ticket-meta">
                        <span>Severity:</span>
                        <span className={`severity-badge ${p.severity?.toLowerCase() || 'medium'}`}>
                          {p.severity || 'MEDIUM'}
                        </span>
                        <span>Assigned Crew:</span>
                        <span style={{ color: '#fff', fontWeight: 600 }}>
                          {p.id % 3 === 0 ? 'ALPHA CREW' : p.id % 3 === 1 ? 'BETA CREW' : 'GAMMA CREW'}
                        </span>
                      </div>
                    </div>

                    <div className="ticket-progress-container">
                      <div className="ticket-progress-bar">
                        <div 
                          className="ticket-progress-fill" 
                          style={{ 
                            width: p.status === 'FILLED' ? '100%' : p.status === 'IN PROGRESS' ? '75%' : p.status === 'REPAIR SCHEDULED' ? '50%' : p.status === 'UNDER INSPECTION' ? '25%' : '5%' 
                          }}
                        ></div>
                      </div>
                      <div className="ticket-steps">
                        <span className={p.status === 'POTHOLE' ? 'active' : ''}>New</span>
                        <span className={p.status === 'UNDER INSPECTION' ? 'active' : ''}>Inspection</span>
                        <span className={p.status === 'REPAIR SCHEDULED' ? 'active' : ''}>Sched</span>
                        <span className={p.status === 'IN PROGRESS' ? 'active' : ''}>Active</span>
                        <span className={p.status === 'FILLED' ? 'active' : ''}>Repaired</span>
                      </div>
                    </div>

                    <div>
                      <select 
                        value={p.status} 
                        onChange={(e) => handleStatusChange(p.id, e.target.value)}
                        style={{
                          background: '#0f172a',
                          border: '1px solid var(--border-glass)',
                          color: '#fff',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="POTHOLE">New</option>
                        <option value="UNDER INSPECTION">Under Inspection</option>
                        <option value="REPAIR SCHEDULED">Repair Scheduled</option>
                        <option value="IN PROGRESS">In Progress</option>
                        <option value="FILLED">Repaired / Filled</option>
                      </select>
                    </div>
                  </div>
                ))}
                {potholes.length === 0 && (
                  <div className="empty-alerts">
                    <Info size={24} className="text-muted" />
                    <p>No active repair requests in progress.</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {mainTab === 'risk' && (
          <section className="hazard-panel animate-slide-in">
            <div className="section-card">
              <h2 className="section-title">
                <AlertTriangle size={18} className="text-amber" />
                <span>Simulated Road Hazard Index Map Overlay</span>
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '8px 0 16px 0' }}>
                Toggle the live spatial hazard index overlay. This applies weather and traffic load inputs onto historical pothole clusters to predict which sectors require preventive road maintenance.
              </p>
              
              <button 
                onClick={() => setShowHeatmap(!showHeatmap)}
                className="download-btn"
                style={{ 
                  background: showHeatmap ? 'linear-gradient(135deg, var(--color-red) 0%, #dc2626 100%)' : 'linear-gradient(135deg, var(--color-primary) 0%, #2563eb 100%)',
                  width: 'fit-content'
                }}
              >
                <Map size={16} />
                <span>{showHeatmap ? 'Disable Heatmap Overlay' : 'Enable Predictor Heatmap Overlay'}</span>
              </button>
            </div>

            <div className="section-card">
              <h2 className="section-title">High Risk Road Sectors</h2>
              <div className="hazard-list" style={{ marginTop: '16px' }}>
                {[
                  { street: 'Haridwar Highway Sector 4', index: 94, level: 'extreme', desc: 'High vehicle weight loading & standing water' },
                  { street: 'Civil Lines Road (near IIT Gate)', index: 81, level: 'high', desc: 'Frequent stop-and-go bus traffic' },
                  { street: 'Railway Station Access Road', index: 68, level: 'high', desc: 'Heavy morning rush hour loading' },
                  { street: 'Cantonment Area Main Boulevard', index: 42, level: 'moderate', desc: 'Optimal drainage conditions' }
                ].map((item) => (
                  <div key={item.street} className="hazard-item">
                    <div className="hazard-name-wrap">
                      <span className="hazard-street-name">{item.street}</span>
                      <span className="hazard-stats-desc">{item.desc}</span>
                    </div>
                    <span className={`hazard-index-badge ${item.level}`}>
                      {item.index}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {mainTab === 'reports' && (
          <section className="reports-layout animate-slide-in">
            <div className="section-card">
              <h2 className="section-title">
                <FileText size={18} className="text-primary" />
                <span>Compile Custom Reports</span>
              </h2>
              
              <div className="report-form" style={{ marginTop: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input type="date" defaultValue="2026-06-01" className="form-input" />
                </div>
                
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input type="date" defaultValue="2026-06-30" className="form-input" />
                </div>

                <div className="form-group">
                  <label className="form-label">Filter Severity</label>
                  <select className="form-select">
                    <option>All Severities</option>
                    <option>High Severity Only</option>
                    <option>Medium Severity Only</option>
                  </select>
                </div>

                <button 
                  onClick={handleExportCSV}
                  className="download-btn"
                >
                  <Download size={16} />
                  <span>Download Live Pothole CSV</span>
                </button>
              </div>
            </div>

            <div className="section-card">
              <h2 className="section-title">Historical Reports</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                {[
                  { name: 'May_2026_Remediation_Report.pdf', size: '2.4 MB', date: 'June 01, 2026' },
                  { name: 'Q1_Road_Health_Summary.xlsx', size: '4.1 MB', date: 'April 01, 2026' }
                ].map((doc) => (
                  <div key={doc.name} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    background: 'rgba(255, 255, 255, 0.01)',
                    border: '1px solid var(--border-glass)',
                    padding: '14px',
                    borderRadius: '10px'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>{doc.name}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Created on {doc.date} &bull; {doc.size}</span>
                    </div>
                    <button 
                      onClick={() => alert('Downloading file...')}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-primary)',
                        cursor: 'pointer'
                      }}
                    >
                      <Download size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
