const admin = require("firebase-admin");

async function verifyFirebaseToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: "No token provided" });

    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token", details: err.message });
  }
}

function requireAdmin(req, res, next) {
  const email = (req.user?.email || "").toLowerCase();
  if (!email.includes("admin")) return res.status(403).json({ error: "Admin only" });
  next();
}

module.exports = { verifyFirebaseToken, requireAdmin };

