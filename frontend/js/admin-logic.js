// frontend/js/admin-logic.js

const API_BASE = "http://localhost:3000"; // backend url

async function apiFetch(path, options = {}) {
  const token = await getIdTokenOrThrow();

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      ...(options.headers || {})
    }
  });

  // try parse json safely
  let data = null;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    const msg = (data && data.message) ? data.message : (typeof data === "string" ? data : `HTTP ${res.status}`);
    throw new Error(msg);
  }

  return data;
}

/* ================= DASHBOARD ================= */
async function getDashboardStats() {
  // If you don’t have this endpoint, it will still work with fallback below
  try {
    const stats = await apiFetch("/api/admin/stats");
    return stats;
  } catch (e) {
    // fallback: compute using other endpoints
    const [inv, comp, fb, users] = await Promise.all([
      loadAllInventory(),
      loadAllComplaints(),
      loadAllFeedback(),
      loadAllUsers()
    ]);

    const pending = (comp || []).filter(c => String(c.status || "").toLowerCase() === "pending").length;

    return {
      inventory: (inv || []).length,
      complaints: (comp || []).length,
      feedback: (fb || []).length,
      users: (users || []).length,
      pendingComplaints: pending
    };
  }
}

/* ================= INVENTORY ================= */
// Backend should support:
// GET    /api/admin/inventory
// POST   /api/admin/inventory
// PUT    /api/admin/inventory/:id
// DELETE /api/admin/inventory/:id

async function loadAllInventory() {
  return await apiFetch("/api/admin/inventory", { method: "GET" });
}

async function addInventoryItem(itemData) {
  return await apiFetch("/api/admin/inventory", {
    method: "POST",
    body: JSON.stringify(itemData)
  });
}

async function updateInventoryItem(id, itemData) {
  return await apiFetch(`/api/admin/inventory/${id}`, {
    method: "PUT",
    body: JSON.stringify(itemData)
  });
}

async function deleteInventoryItem(id) {
  return await apiFetch(`/api/admin/inventory/${id}`, { method: "DELETE" });
}

/* ================= COMPLAINTS ================= */
// GET  /api/admin/complaints
// PUT  /api/admin/complaints/:id

async function loadAllComplaints() {
  return await apiFetch("/api/admin/complaints", { method: "GET" });
}

async function updateComplaint(id, payload) {
  return await apiFetch(`/api/admin/complaints/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

/* ================= FEEDBACK ================= */
// GET /api/admin/feedback

async function loadAllFeedback() {
  return await apiFetch("/api/admin/feedback", { method: "GET" });
}

/* ================= USERS ================= */
// GET /api/admin/users
// PUT /api/admin/users/:id/toggle   { isActive: true/false }

async function loadAllUsers() {
  return await apiFetch("/api/admin/users", { method: "GET" });
}

async function toggleUserStatus(userId, currentIsActive) {
  // toggle
  return await apiFetch(`/api/admin/users/${userId}/toggle`, {
    method: "PUT",
    body: JSON.stringify({ isActive: !currentIsActive })
  });
}
