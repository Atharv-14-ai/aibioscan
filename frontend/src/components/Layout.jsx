import { useState, useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Activity,
  History,
  PieChart,
  LogOut,
  Settings,
  Bell,
  Search,
  Menu,
  X,
} from "lucide-react";
import "../index.css";

function Layout({ user, onLogout }) {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Automatically close the mobile menu when the route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const navItems = [
    { path: "/", icon: <LayoutDashboard size={20} />, label: "Dashboard" },
    { path: "/scan", icon: <Activity size={20} />, label: "New AI Scan" },
    { path: "/history", icon: <History size={20} />, label: "Patient History" },
    {
      path: "/analytics",
      icon: <PieChart size={20} />,
      label: "Clinical Overview",
    },
  ];

  return (
    <div className="app-layout">
      {/* Mobile Overlay - Clicking this closes the menu */}
      <div
        className={`sidebar-overlay ${isMobileMenuOpen ? "active" : ""}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* SIDEBAR */}
      <aside className={`sidebar ${isMobileMenuOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <Activity color="#38bdf8" size={28} />
          <h2>AI-BioScan</h2>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? "active" : ""}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="avatar">{user.full_name.charAt(0)}</div>
            <div className="user-info">
              <span className="user-name">{user.full_name}</span>
            </div>
          </div>
          <button onClick={onLogout} className="logout-btn">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="main-content">
        {/* TOP HEADER */}
        <header className="topbar">
          {/* Hamburger Menu for Mobile */}
          <button
            className="mobile-menu-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div className="search-bar">
            <Search size={18} color="#64748b" />
            <input
              type="text"
              placeholder="Search patient ID or condition..."
            />
          </div>

          <div className="topbar-actions">
            <button className="icon-btn">
              <Bell size={20} />
            </button>
            <button className="icon-btn">
              <Settings size={20} />
            </button>
          </div>
        </header>

        {/* PAGE CONTENT INJECTED HERE */}
        <div className="page-container">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default Layout;
