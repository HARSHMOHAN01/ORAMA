import React from 'react';
import { ShieldAlert, Link as LinkIcon, Radio } from 'lucide-react';

const Navbar = ({ isConnected }) => {
  return (
    <header className="navbar">
      <div className="navbar-brand">
        <ShieldAlert className="navbar-logo-icon text-red" />
        <h1 className="navbar-title">SMART POTHOLE MONITORING SYSTEM</h1>
      </div>
      
      <div className="navbar-actions">
        {/* Real-time Status Badge */}
        <div className={`status-badge ${isConnected ? 'connected' : 'disconnected'}`}>
          <Radio className="status-icon" size={16} />
          <span>{isConnected ? 'Socket Connected' : 'Waiting...'}</span>
          <span className="status-ping"></span>
        </div>

        {/* Link to Flask Admin Panel */}
        <a 
          href="http://localhost:5000/admin" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="admin-link-btn"
        >
          <LinkIcon size={14} />
          <span>Flask Admin Panel</span>
        </a>
      </div>
    </header>
  );
};

export default Navbar;
