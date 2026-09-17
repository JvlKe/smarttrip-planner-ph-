export function profileDisplayName(profile, user) {
  return (
    profile?.nickname?.trim() ||
    user?.user_metadata?.nickname?.trim() ||
    profile?.fullName?.trim() ||
    user?.user_metadata?.full_name?.trim() ||
    user?.email?.split("@")[0] ||
    "Traveler"
  );
}

export function profileGreetingName(profile, user) {
  const nickname =
    profile?.nickname?.trim() || user?.user_metadata?.nickname?.trim();
  if (nickname) return nickname;
  return profileDisplayName(profile, user).split(/\s+/)[0];
}
