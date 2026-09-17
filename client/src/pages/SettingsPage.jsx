import { useState } from "react";
import DeleteAccount from "../components/DeleteAccount";
import PageHeader from "../components/PageHeader";
import useTheme from "../hooks/useTheme";
export default function SettingsPage() {
  const [notificationMessage, setNotificationMessage] = useState("");
  const { dark, toggleTheme } = useTheme();
  const [notifications, setNotifications] = useState(
    () => localStorage.getItem("tripNotifications") === "on",
  );
  async function toggleNotifications() {
    if (!("Notification" in window))
      return setNotificationMessage(
        "This browser does not support notifications.",
      );
    if (!notifications) {
      const permission = await Notification.requestPermission();
      if (permission !== "granted")
        return setNotificationMessage(
          "Notification permission was not granted.",
        );
      localStorage.setItem("tripNotifications", "on");
      setNotifications(true);
      setNotificationMessage("Departure reminders enabled on this device.");
    } else {
      localStorage.removeItem("tripNotifications");
      setNotifications(false);
      setNotificationMessage("Departure reminders disabled.");
    }
  }
  async function testNotification() {
    setNotificationMessage("");
    if (!("Notification" in window))
      return setNotificationMessage(
        "This browser does not support notifications.",
      );
    let permission = Notification.permission;
    if (permission === "default")
      permission = await Notification.requestPermission();
    if (permission !== "granted")
      return setNotificationMessage(
        "Notifications are blocked. Allow them in your browser's site settings, then try again.",
      );
    const notification = new Notification("SmartTrip notification test", {
      body: "Notifications are working. Atlas will remind you before an upcoming trip.",
      icon: "/assets/lakbay-tarsier.webp",
      badge: "/assets/lakbay-tarsier.webp",
      tag: "smarttrip-notification-test",
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    setNotificationMessage("Test notification sent successfully.");
  }
  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Make SmartTrip feel right for you."
      />
      <div className="page">
        <section className="form-card settings-card theme-setting">
          <div>
            <h3>Appearance</h3>
            <p>Use a darker color scheme for low-light planning.</p>
          </div>
          <button type="button" className="btn outline" onClick={toggleTheme}>
            {dark ? "Use light mode" : "Use dark mode"}
          </button>
        </section>
        <section className="form-card settings-card theme-setting">
          <div>
            <h3>Departure reminders</h3>
            <p>
              Show a browser reminder up to three days before a trip on this
              device.
            </p>
          </div>
          <div className="setting-actions">
            <button
              type="button"
              className="btn outline"
              onClick={testNotification}
            >
              Send test notification
            </button>
            <button
              type="button"
              className="btn outline"
              onClick={toggleNotifications}
            >
              {notifications ? "Disable reminders" : "Enable reminders"}
            </button>
            {notificationMessage && (
              <small className="settings-message" role="status">
                {notificationMessage}
              </small>
            )}
          </div>
        </section>
        <section
          className="form-card settings-card"
          aria-labelledby="delete-account-heading"
        >
          <div className="form-title">
            <span aria-hidden="true">!</span>
            <div>
              <h3 id="delete-account-heading">Delete account</h3>
              <p>
                Permanently remove your SmartTrip account and saved trips. This
                cannot be undone.
              </p>
            </div>
          </div>
          <p>
            You will need your current password and a final confirmation before
            anything is deleted.
          </p>
          <div className="inline-actions">
            <span />
            <DeleteAccount />
          </div>
        </section>
      </div>
    </>
  );
}
