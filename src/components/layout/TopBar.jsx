import { NavLink } from "react-router-dom";

import { PulseIcon } from "../common/icons";

const navItems = [
  { label: "Import", to: "/import-data" },
  { label: "Map", to: "/map-columns" },
  { label: "Dashboard", to: "/dashboard" },
  { label: "Agents", to: "/agents" },
];

export default function TopBar() {
  return (
    <div className="topbar">
      <div className="topbar-inner">
        <div className="topbar-left">
          <div className="brand">
            <div className="brand-logo">
              <PulseIcon />
            </div>
            <div className="brand-title">AgencyPulse</div>
          </div>

          <nav className="topbar-nav">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `topbar-link${isActive ? " active" : ""}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="user">
          <div className="user-text">Welcome back</div>
          <div className="avatar" />
        </div>
      </div>
    </div>
  );
}
