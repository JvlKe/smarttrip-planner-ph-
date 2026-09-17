import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/PageHeader";
import Icon from "../components/Icon";
import useTrips from "../hooks/useTrips";
import { summarizeTrips } from "../lib/tripView";
import ChangePasswordForm from "../components/ChangePasswordForm";
import { supabase } from "../lib/supabase";
import { profileDisplayName } from "../lib/profileName";

export default function ProfilePage() {
  const { user, profile, setProfile, signOut } = useAuth();
  const {
    trips,
    loading: loadingTrips,
    error: tripsError,
    reload,
  } = useTrips();
  const stats = summarizeTrips(trips);
  const [form, setForm] = useState({
    fullName: user?.user_metadata?.full_name || "",
    nickname: user?.user_metadata?.nickname || "",
    phone: "",
    location: "",
    bio: "",
    avatarData: "",
  });
  const [status, setStatus] = useState("");
  useEffect(() => {
    if (profile) {
      setForm({
        fullName: profile.fullName || "",
        nickname: user?.user_metadata?.nickname || "",
        phone: profile.phone || "",
        location: profile.location || "",
        bio: profile.bio || "",
        avatarData: profile.avatarData || "",
      });
      return;
    }
    api("/profile")
      .then((p) => {
        if (p) {
          setProfile(p);
          setForm({
            fullName: p.fullName || "",
            nickname: user?.user_metadata?.nickname || "",
            phone: p.phone || "",
            location: p.location || "",
            bio: p.bio || "",
            avatarData: p.avatarData || "",
          });
        }
      })
      .catch(() => {});
  }, [profile, user?.user_metadata?.nickname]);
  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  async function photo(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 8e6) return setStatus("Photo must be under 8 MB.");
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = c.height = 256;
      const s = Math.min(img.width, img.height),
        x = (img.width - s) / 2,
        y = (img.height - s) / 2;
      c.getContext("2d").drawImage(img, x, y, s, s, 0, 0, 256, 256);
      setForm((f) => ({ ...f, avatarData: c.toDataURL("image/webp", 0.78) }));
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  }
  async function save(e) {
    e.preventDefault();
    setStatus("Saving…");
    try {
      const nickname = form.nickname.trim();
      const { error: nicknameError } = await supabase.auth.updateUser({
        data: { nickname },
      });
      if (nicknameError) throw nicknameError;
      const { nickname: _nickname, ...profileFields } = form;
      const saved = await api("/profile", {
        method: "PUT",
        body: JSON.stringify(profileFields),
      });
      setProfile(saved);
      setStatus("Profile saved.");
    } catch (e) {
      setStatus(e.message);
    }
  }
  const achievements = [
    [
      "map",
      "Island Explorer",
      "Plan trips to 5 destinations",
      stats.destinations >= 5,
      stats.destinations,
      5,
    ],
    [
      "calendar",
      "Itinerary Maker",
      "Plan 10 trips",
      stats.total >= 10,
      stats.total,
      10,
    ],
    [
      "plane",
      "Seasoned Traveler",
      "Complete 5 trips",
      stats.completed >= 5,
      stats.completed,
      5,
    ],
    [
      "award",
      "First Adventure",
      "Complete your first trip",
      stats.completed >= 1,
      stats.completed,
      1,
    ],
  ];
  const displayName = profileDisplayName(
    { ...profile, nickname: form.nickname },
    user,
  );
  return (
    <>
      <PageHeader
        title="My Profile"
        subtitle="Your details, travel milestones, and account."
      />
      <div className="page profile-layout">
        <section className="profile-overview raised-card">
          <div className="profile-banner" />
          <div className="profile-portrait">
            {profile?.avatarData ? (
              <img src={profile.avatarData} alt="Your profile" />
            ) : (
              displayName.slice(0, 2).toUpperCase()
            )}
          </div>
          <h2>
            {displayName}
          </h2>
          <p>{user?.email}</p>
          {profile?.location && <p>{profile.location}</p>}
          <p>
            Member since{" "}
            {new Date(
              profile?.createdAt || user?.created_at || Date.now(),
            ).toLocaleDateString("en-PH", { month: "long", year: "numeric" })}
          </p>
          <a className="btn ghost" href="#profile-information">
            <Icon name="edit" size={16} /> Edit profile
          </a>
          <div className="profile-stats">
            {[
              [stats.total, "Total trips"],
              [stats.completed, "Completed"],
              [stats.destinations, "Destinations"],
              [stats.days, "Days planned"],
            ].map(([value, label]) => (
              <div key={label}>
                <b>{loadingTrips || tripsError ? "–" : value}</b>
                <small>{label}</small>
              </div>
            ))}
          </div>
        </section>
        <div className="profile-columns">
          <form
            id="profile-information"
            className="form-card settings-card"
            onSubmit={save}
          >
            <div className="form-title">
              <span>◉</span>
              <div>
                <h3>Personal information</h3>
                <p>Your basic information for SmartTrip.</p>
              </div>
            </div>
            <div className="avatar-editor">
              {form.avatarData ? (
                <img src={form.avatarData} alt="Profile preview" />
              ) : (
                <span>{(form.fullName || "T").slice(0, 2).toUpperCase()}</span>
              )}
              <label className="btn outline">
                Choose photo
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={photo}
                  hidden
                />
              </label>
              {form.avatarData && (
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setForm({ ...form, avatarData: "" })}
                >
                  Remove
                </button>
              )}
            </div>
            <div className="field-grid">
              <label>
                Full name
                <input
                  name="fullName"
                  value={form.fullName}
                  onChange={update}
                  required
                />
              </label>
              <label>
                Nickname (optional)
                <input
                  name="nickname"
                  value={form.nickname}
                  onChange={update}
                  maxLength="40"
                  placeholder="e.g. John"
                  autoComplete="nickname"
                />
                <small className="field-help">
                  Used for greetings and your display name when provided.
                </small>
              </label>
              <label>
                Email
                <input value={user?.email || ""} disabled />
              </label>
              <label>
                Phone (optional)
                <input name="phone" value={form.phone} onChange={update} />
              </label>
              <label>
                Starting point
                <input
                  name="location"
                  value={form.location}
                  onChange={update}
                  placeholder="e.g. Tokyo, Japan or MNL Terminal 3"
                  maxLength="160"
                  required
                />
                <small className="field-help">
                  Required for trip planning and directions. International
                  cities, airports, and full addresses are supported.
                </small>
              </label>
            </div>
            <label>
              Bio (optional)
              <textarea
                name="bio"
                value={form.bio}
                onChange={update}
                maxLength="400"
                rows="4"
              />
            </label>
            <div className="inline-actions">
              <span role="status">{status}</span>
              <button className="btn primary">Save profile</button>
            </div>
          </form>
          <ChangePasswordForm />
          <section className="raised-card analytics-panel">
            <div className="section-heading">
              <h2>Travel achievements</h2>
              <Icon name="award" />
            </div>
            {tripsError ? (
              <div role="alert">
                <p>{tripsError}</p>
                <button className="btn ghost" onClick={reload}>
                  Retry
                </button>
              </div>
            ) : (
              <div className="achievement-grid">
                {achievements.map(
                  ([icon, title, description, unlocked, value, target]) => (
                    <article
                      className={`achievement ${unlocked ? "unlocked" : ""}`}
                      key={title}
                    >
                      <Icon name={icon} size={28} />
                      <h3>{title}</h3>
                      <p>{description}</p>
                      <span>
                        {loadingTrips
                          ? "Loading…"
                          : unlocked
                            ? "Unlocked"
                            : `${Math.min(value, target)} / ${target}`}
                      </span>
                    </article>
                  ),
                )}
              </div>
            )}
          </section>
        </div>
        <section className="account-actions raised-card">
          <h2>Account actions</h2>
          <button className="btn outline" type="button" onClick={signOut}>
            <Icon name="logout" size={16} /> Log out
          </button>
        </section>
      </div>
    </>
  );
}
