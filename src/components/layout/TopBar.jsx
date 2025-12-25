import { PulseIcon } from "../common/icons";

export default function TopBar() {
  return (
    <div className="topbar">
      <div className="topbar-inner">
        <div className="brand">
          <div className="brand-logo">
            <PulseIcon />
          </div>
          <div className="brand-title">AgencyPulse</div>
        </div>

        <div className="user">
          <div className="user-text">Welcome back</div>
          <div className="avatar" />
        </div>
      </div>
    </div>
  );
}
