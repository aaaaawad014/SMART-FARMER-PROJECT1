// frontend/js/profile.js
const API_BASE = "http://localhost:6000";

window.upsertProfile = async function upsertProfile(extra = {}) {
  const user = firebase.auth().currentUser;
  if (!user) throw new Error("Not logged in");

  const token = await user.getIdToken();

  const res = await fetch(API_BASE + "/api/profile", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify({
      email: user.email || "",
      ...extra
    })
  });

  let data = {};
  try { data = await res.json(); } catch (e) {}

  if (!res.ok) throw new Error(data.message || "Profile save failed");
  return data;
};

console.log("✅ profile.js loaded (upsertProfile ready)");
