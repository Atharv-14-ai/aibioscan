import { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// Components
import Auth from "./components/Auth";
import History from "./components/History";
import Layout from "./components/Layout";
import Dashboard from "./components/Dashboard";
import Scanner from "./components/Scanner";
import Analytics from "./components/Analytics";
import "./index.css";

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("bioscan_user");
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem("bioscan_user", JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("bioscan_user");
  };

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={<Layout user={user} onLogout={handleLogout} />}
        >
          <Route index element={<Dashboard user={user} />} />
          <Route path="scan" element={<Scanner user={user} />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="history" element={<History user={user} />} />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
