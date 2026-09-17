import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Icon from "./Icon";
import ThemeToggle from "./ThemeToggle";
import { profileDisplayName } from "../lib/profileName";
export default function PageHeader({ title, subtitle, children }) {
  const { user, profile } = useAuth();
  const name = profileDisplayName(profile, user);
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="page-header-actions">
        <ThemeToggle />
        {children}
        <Link
          className="round-action"
          to="/app/trips"
          aria-label="Search your trips"
        >
          <Icon name="search" />
        </Link>
        <Link
          className="round-action"
          to="/app/map"
          aria-label="Open travel map"
        >
          <Icon name="map" />
        </Link>
        <Link
          className="avatar"
          to="/app/profile"
          aria-label="Open your profile"
        >
          {profile?.avatarData ? (
            <img src={profile.avatarData} alt="" />
          ) : (
            name.slice(0, 2).toUpperCase()
          )}
        </Link>
      </div>
    </header>
  );
}
