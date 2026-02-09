const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

const connectDB = require("./db");
const { verifyFirebaseToken, requireAdmin } = require("./middlewareAuth");

const User = require("./models/User");
const Crop = require("./models/Crop");
const Inventory = require("./models/Inventory");
const Complaint = require("./models/Complaint");
const Feedback = require("./models/Feedback");

const serviceAccount = require("./firebaseAdminKey.json");
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Health Check
app.get("/", (req, res) => {
  res.json({ ok: true, msg: "Smart Farmer Backend Running" });
});

// ---------------- USER PROFILE ----------------
app.post("/api/users/upsert", verifyFirebaseToken, async (req, res) => {
  try {
    const { name = "" } = req.body || {};
    const uid = req.user.uid;
    const email = (req.user.email || "").toLowerCase();
    const role = email.includes("admin") ? "admin" : "farmer";

    const user = await User.findOneAndUpdate(
      { uid },
      { uid, email, name, role },
      { new: true, upsert: true }
    );

    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/users/me", verifyFirebaseToken, async (req, res) => {
  const uid = req.user.uid;
  const user = await User.findOne({ uid });
  res.json(user || { uid, email: req.user.email || "", role: "farmer", name: "" });
});

// ---------------- CROPS (FARMER CRUD) ----------------
// Add crop
app.post("/api/crops", verifyFirebaseToken, async (req, res) => {
  try {
    const { cropName, season, area, quantity } = req.body;
    
    if (!cropName || !season) {
      return res.status(400).json({ error: "Crop name and season are required" });
    }

    const crop = await Crop.create({
      farmerId: req.user.uid,
      cropName,
      season,
      area: area || 0,
      quantity: quantity || 0
    });
    
    res.status(201).json(crop);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Get farmer's crops
app.get("/api/crops", verifyFirebaseToken, async (req, res) => {
  try {
    const crops = await Crop.find({ farmerId: req.user.uid }).sort({ createdAt: -1 });
    res.json(crops);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update crop
app.put("/api/crops/:id", verifyFirebaseToken, async (req, res) => {
  try {
    const updated = await Crop.findOneAndUpdate(
      { _id: req.params.id, farmerId: req.user.uid },
      req.body,
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "Crop not found" });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete crop
app.delete("/api/crops/:id", verifyFirebaseToken, async (req, res) => {
  try {
    const del = await Crop.findOneAndDelete({ _id: req.params.id, farmerId: req.user.uid });
    if (!del) return res.status(404).json({ error: "Crop not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------- INVENTORY (FARMER VIEW) ----------------
app.get("/api/inventory", verifyFirebaseToken, async (req, res) => {
  try {
    const list = await Inventory.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------- COMPLAINTS ----------------
app.post("/api/complaints", verifyFirebaseToken, async (req, res) => {
  try {
    console.log("📝 Complaint submission received:", req.body);
    console.log("👤 User:", req.user);
    
    const { title, message } = req.body;
    
    if (!title || !message) {
      console.error("❌ Missing title or message");
      return res.status(400).json({ error: "Title and message are required" });
    }

    // Create complaint with user info from token
    const complaint = await Complaint.create({
      farmerId: req.user.uid,
      farmerEmail: req.user.email || "",
      farmerName: req.user.name || "Unknown Farmer",
      title: title.trim(),
      message: message.trim(),
      status: "pending"
    });
    
    console.log("✅ Complaint created:", complaint._id);
    res.status(201).json({ 
      success: true, 
      message: "Complaint submitted successfully",
      complaint: complaint 
    });
    
  } catch (e) {
    console.error("❌ Error creating complaint:", e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/complaints/me", verifyFirebaseToken, async (req, res) => {
  try {
    console.log("📋 Fetching complaints for user:", req.user.uid);
    
    const complaints = await Complaint.find({ 
      farmerId: req.user.uid 
    }).sort({ createdAt: -1 });
    
    console.log(`✅ Found ${complaints.length} complaints`);
    res.json(complaints);
    
  } catch (e) {
    console.error("❌ Error fetching complaints:", e.message);
    res.status(500).json({ error: "Failed to load complaints" });
  }
});

// ---------------- FEEDBACK ----------------
app.post("/api/feedback", verifyFirebaseToken, async (req, res) => {
  console.log("\n=== FEEDBACK SUBMISSION START ===");
  console.log("📝 Request received at:", new Date().toISOString());
  
  try {
    // Log the incoming request
    console.log("📨 Request body:", JSON.stringify(req.body, null, 2));
    console.log("👤 User from token:", {
      uid: req.user.uid,
      email: req.user.email,
      name: req.user.name || 'No name'
    });

    const { rating, message } = req.body;
    
    // Validate input
    if (!message || message.trim() === '') {
      console.error("❌ Validation failed: Message is required");
      return res.status(400).json({ 
        error: "Feedback message is required",
        receivedData: req.body 
      });
    }

    // Prepare feedback data
    const feedbackData = {
      farmerId: req.user.uid,
      farmerEmail: req.user.email || "",
      farmerName: req.user.name || "Unknown Farmer",
      rating: parseInt(rating) || 5,
      message: message.trim()
    };
    
    console.log("📤 Prepared data for saving:", feedbackData);
    
    // Try to save
    console.log("💾 Attempting to save to database...");
    const doc = await Feedback.create(feedbackData);
    
    console.log("✅ SAVED SUCCESSFULLY!");
    console.log("📄 Saved document:", JSON.stringify(doc, null, 2));
    console.log("🔢 Document ID:", doc._id);
    console.log("🕒 Created at:", doc.createdAt);
    
    // Immediately verify it exists
    const verifyDoc = await Feedback.findById(doc._id);
    console.log("🔍 Verification - Found by ID:", verifyDoc ? "✅ Yes" : "❌ No");
    
    // Count total feedback
    const count = await Feedback.countDocuments({ farmerId: req.user.uid });
    console.log(`📊 Total feedback from this user: ${count}`);
    
    console.log("=== FEEDBACK SUBMISSION END ===\n");
    
    res.status(201).json({
      success: true,
      message: "Feedback submitted successfully",
      feedback: doc,
      userFeedbackCount: count
    });
    
  } catch (error) {
    console.error("❌ Error creating feedback:", error.message);
    console.error("❌ Error stack:", error.stack);
    console.log("=== FEEDBACK SUBMISSION ERROR ===\n");
    
    res.status(500).json({ 
      error: "Failed to save feedback",
      details: error.message 
    });
  }
});

// Get user's feedback
app.get("/api/feedback/me", verifyFirebaseToken, async (req, res) => {
  try {
    console.log("📋 Fetching feedback for user:", req.user.uid);
    
    const feedback = await Feedback.find({ 
      farmerId: req.user.uid 
    }).sort({ createdAt: -1 });
    
    console.log(`✅ Found ${feedback.length} feedback entries`);
    res.json(feedback);
    
  } catch (e) {
    console.error("❌ Error fetching feedback:", e.message);
    res.status(500).json({ error: "Failed to load feedback" });
  }
});

// Get all feedback (admin or for debugging)
app.get("/api/feedback/all", async (req, res) => {
  try {
    console.log("📋 Fetching ALL feedback...");
    const allFeedback = await Feedback.find().sort({ createdAt: -1 });
    console.log(`✅ Found ${allFeedback.length} total feedback entries`);
    res.json(allFeedback);
  } catch (e) {
    console.error("❌ Error fetching all feedback:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ---------------- ADMIN: COMPLAINT MANAGEMENT ----------------
app.get("/api/admin/complaints", verifyFirebaseToken, requireAdmin, async (req, res) => {
  try {
    const list = await Complaint.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/admin/complaints/:id", verifyFirebaseToken, requireAdmin, async (req, res) => {
  try {
    const { status, resolutionNotes } = req.body || {};
    const updated = await Complaint.findByIdAndUpdate(
      req.params.id,
      { status, resolutionNotes },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "Complaint not found" });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------- ADMIN: FEEDBACK VIEW ----------------
app.get("/api/admin/feedback", verifyFirebaseToken, requireAdmin, async (req, res) => {
  try {
    const list = await Feedback.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------- ADMIN: INVENTORY CRUD ----------------
app.post("/api/admin/inventory", verifyFirebaseToken, requireAdmin, async (req, res) => {
  try {
    const { itemName, category, availableQty, unit, price } = req.body;
    
    if (!itemName || !category) {
      return res.status(400).json({ error: "Item name and category are required" });
    }

    const doc = await Inventory.create({
      itemName,
      category,
      availableQty: availableQty || 0,
      unit: unit || "kg",
      price: price || 0
    });
    
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get("/api/admin/inventory", verifyFirebaseToken, requireAdmin, async (req, res) => {
  try {
    const list = await Inventory.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/admin/inventory/:id", verifyFirebaseToken, requireAdmin, async (req, res) => {
  try {
    const updated = await Inventory.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: "Item not found" });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/admin/inventory/:id", verifyFirebaseToken, requireAdmin, async (req, res) => {
  try {
    const del = await Inventory.findByIdAndDelete(req.params.id);
    if (!del) return res.status(404).json({ error: "Item not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
      console.log(`📊 API Endpoints:`);
      console.log(`   POST /api/crops - Add crop`);
      console.log(`   GET  /api/crops - Get crops`);
      console.log(`   GET  /api/inventory - Get inventory`);
      console.log(`   POST /api/complaints - Submit complaint`);
      console.log(`   GET  /api/complaints/me - Get my complaints`);
      console.log(`   POST /api/feedback - Submit feedback`);
      console.log(`   GET  /api/feedback/me - Get my feedback`);
      console.log(`   GET  /api/feedback/all - Get all feedback (debug)`);
    });
  })
  .catch((e) => {
    console.error("❌ MongoDB connection failed:", e.message);
    process.exit(1);
    // ---------------- FEEDBACK ----------------
app.post("/api/feedback", verifyFirebaseToken, async (req, res) => {
  console.log("\n=== FEEDBACK API HIT ===");
  console.log("📨 Incoming request at:", new Date().toISOString());
  console.log("📦 Request body:", req.body);
  console.log("👤 User ID:", req.user?.uid);
  console.log("📧 User Email:", req.user?.email);
  
  try {
    const { rating, message } = req.body;
    
    // Validate
    if (!message || message.trim() === '') {
      console.error("❌ Validation failed: Empty message");
      return res.status(400).json({ error: "Feedback message is required" });
    }
    
    // Create feedback document
    const feedbackData = {
      farmerId: req.user.uid,
      farmerEmail: req.user.email || "",
      farmerName: req.user.name || "Unknown Farmer",
      rating: parseInt(rating) || 5,
      message: message.trim()
    };
    
    console.log("💾 Saving to database:", feedbackData);
    
    const doc = await Feedback.create(feedbackData);
    
    console.log("✅ SAVED TO DATABASE!");
    console.log("🔢 Document ID:", doc._id);
    console.log("📊 Full document:", JSON.stringify(doc, null, 2));
    
    // Verify save
    const verify = await Feedback.findById(doc._id);
    console.log("🔍 Verification:", verify ? "SUCCESS" : "FAILED");
    
    res.status(201).json({
      success: true,
      message: "Feedback submitted successfully",
      feedback: doc
    });
    
  } catch (error) {
    console.error("❌ DATABASE ERROR:", error.message);
    console.error("❌ Error stack:", error.stack);
    res.status(500).json({ 
      success: false,
      error: "Failed to save feedback",
      details: error.message 
    });
  }
});
// Add after your existing admin inventory routes

// ---------------- ADMIN: USERS MANAGEMENT ----------------
app.get("/api/admin/users", verifyFirebaseToken, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/admin/users/:id/toggle", verifyFirebaseToken, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    
    user.isActive = !user.isActive;
    await user.save();
    
    res.json({ success: true, isActive: user.isActive });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------- ADMIN: DASHBOARD STATS ----------------
app.get("/api/admin/stats", verifyFirebaseToken, requireAdmin, async (req, res) => {
  try {
    const [
      inventoryCount,
      complaintsCount,
      feedbackCount,
      usersCount,
      pendingComplaints
    ] = await Promise.all([
      Inventory.countDocuments(),
      Complaint.countDocuments(),
      Feedback.countDocuments(),
      User.countDocuments(),
      Complaint.countDocuments({ status: "pending" })
    ]);
    
    res.json({
      inventory: inventoryCount,
      complaints: complaintsCount,
      feedback: feedbackCount,
      users: usersCount,
      pendingComplaints: pendingComplaints
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------- ADMIN: DELETE FEEDBACK ----------------
app.delete("/api/admin/feedback/:id", verifyFirebaseToken, requireAdmin, async (req, res) => {
  try {
    const deleted = await Feedback.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Feedback not found" });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
// Add this to your backend/server.js after other admin routes

// ---------------- ADMIN: DASHBOARD STATS ----------------
app.get("/api/admin/stats", verifyFirebaseToken, requireAdmin, async (req, res) => {
  try {
    console.log("📊 Admin requesting dashboard stats...");
    
    // Get counts from all collections
    const [inventoryCount, complaintsCount, feedbackCount, usersCount, pendingComplaints] = await Promise.all([
      Inventory.countDocuments(),
      Complaint.countDocuments(),
      Feedback.countDocuments(),
      User.countDocuments(),
      Complaint.countDocuments({ status: "pending" })
    ]);
    
    const stats = {
      inventory: inventoryCount,
      complaints: complaintsCount,
      feedback: feedbackCount,
      users: usersCount,
      pendingComplaints: pendingComplaints
    };
    
    console.log("✅ Stats calculated:", stats);
    res.json(stats);
    
  } catch (error) {
    console.error("❌ Error calculating stats:", error);
    res.status(500).json({ 
      error: error.message,
      message: "Failed to fetch dashboard statistics" 
    });
  }
});
// Add this to your server.js file AFTER line 250 (after other admin routes)

// ---------------- ADMIN: DASHBOARD STATS ----------------
app.get("/api/admin/stats", verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
        console.log("📊 Admin requesting dashboard stats...");
        
        // Get counts from all collections
        const [
            inventoryCount,
            complaintsCount,
            feedbackCount,
            usersCount,
            pendingComplaints
        ] = await Promise.all([
            Inventory.countDocuments(),
            Complaint.countDocuments(),
            Feedback.countDocuments(),
            User.countDocuments(),
            Complaint.countDocuments({ status: "pending" })
        ]);
        
        const stats = {
            inventory: inventoryCount,
            complaints: complaintsCount,
            feedback: feedbackCount,
            users: usersCount,
            pendingComplaints: pendingComplaints
        };
        
        console.log("✅ Stats calculated:", stats);
        res.json(stats);
        
    } catch (error) {
        console.error("❌ Error calculating stats:", error);
        res.status(500).json({ 
            error: error.message,
            message: "Failed to fetch dashboard statistics" 
        });
    }
});

// ---------------- ADMIN: USERS MANAGEMENT ----------------
app.get("/api/admin/users", verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
        const users = await User.find().sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put("/api/admin/users/:id/toggle", verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: "User not found" });
        
        user.isActive = !user.isActive;
        await user.save();
        
        res.json({ success: true, isActive: user.isActive });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ---------------- ADMIN: DELETE FEEDBACK ----------------
app.delete("/api/admin/feedback/:id", verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
        const deleted = await Feedback.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ error: "Feedback not found" });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

const connectDB = require("./db");
const { verifyFirebaseToken, requireAdmin } = require("./middlewareAuth");

const User = require("./models/User");
const Crop = require("./models/Crop");
const Inventory = require("./models/Inventory");
const Complaint = require("./models/Complaint");
const Feedback = require("./models/Feedback");

const serviceAccount = require("./firebaseAdminKey.json");
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Health Check
app.get("/", (req, res) => {
  res.json({ ok: true, msg: "Smart Farmer Backend Running" });
});

// ---------------- USER PROFILE ----------------
app.post("/api/users/upsert", verifyFirebaseToken, async (req, res) => {
  try {
    const { name = "" } = req.body || {};
    const uid = req.user.uid;
    const email = (req.user.email || "").toLowerCase();
    const role = email.includes("admin") ? "admin" : "farmer";

    const user = await User.findOneAndUpdate(
      { uid },
      { uid, email, name, role },
      { new: true, upsert: true }
    );

    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/users/me", verifyFirebaseToken, async (req, res) => {
  const uid = req.user.uid;
  const user = await User.findOne({ uid });
  res.json(user || { uid, email: req.user.email || "", role: "farmer", name: "" });
});

// ---------------- CROPS (FARMER CRUD) ----------------
// Add crop
app.post("/api/crops", verifyFirebaseToken, async (req, res) => {
  try {
    const { cropName, season, area, quantity } = req.body;
    
    if (!cropName || !season) {
      return res.status(400).json({ error: "Crop name and season are required" });
    }

    const crop = await Crop.create({
      farmerId: req.user.uid,
      cropName,
      season,
      area: area || 0,
      quantity: quantity || 0
    });
    
    res.status(201).json(crop);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Get farmer's crops
app.get("/api/crops", verifyFirebaseToken, async (req, res) => {
  try {
    const crops = await Crop.find({ farmerId: req.user.uid }).sort({ createdAt: -1 });
    res.json(crops);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update crop
app.put("/api/crops/:id", verifyFirebaseToken, async (req, res) => {
  try {
    const updated = await Crop.findOneAndUpdate(
      { _id: req.params.id, farmerId: req.user.uid },
      req.body,
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "Crop not found" });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete crop
app.delete("/api/crops/:id", verifyFirebaseToken, async (req, res) => {
  try {
    const del = await Crop.findOneAndDelete({ _id: req.params.id, farmerId: req.user.uid });
    if (!del) return res.status(404).json({ error: "Crop not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------- INVENTORY (FARMER VIEW) ----------------
app.get("/api/inventory", verifyFirebaseToken, async (req, res) => {
  try {
    const list = await Inventory.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------- COMPLAINTS ----------------
app.post("/api/complaints", verifyFirebaseToken, async (req, res) => {
  try {
    const { title, message } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({ error: "Title and message are required" });
    }

    const complaint = await Complaint.create({
      farmerId: req.user.uid,
      farmerEmail: req.user.email || "",
      farmerName: req.user.name || "Unknown Farmer",
      title: title.trim(),
      message: message.trim(),
      status: "pending"
    });
    
    res.status(201).json({ 
      success: true, 
      message: "Complaint submitted successfully",
      complaint: complaint 
    });
    
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/complaints/me", verifyFirebaseToken, async (req, res) => {
  try {
    const complaints = await Complaint.find({ 
      farmerId: req.user.uid 
    }).sort({ createdAt: -1 });
    
    res.json(complaints);
  } catch (e) {
    res.status(500).json({ error: "Failed to load complaints" });
  }
});

// ---------------- FEEDBACK ----------------
app.post("/api/feedback", verifyFirebaseToken, async (req, res) => {
  try {
    const { rating, message } = req.body;
    
    if (!message || message.trim() === '') {
      return res.status(400).json({ 
        error: "Feedback message is required"
      });
    }

    const feedbackData = {
      farmerId: req.user.uid,
      farmerEmail: req.user.email || "",
      farmerName: req.user.name || "Unknown Farmer",
      rating: parseInt(rating) || 5,
      message: message.trim()
    };
    
    const doc = await Feedback.create(feedbackData);
    
    res.status(201).json({
      success: true,
      message: "Feedback submitted successfully",
      feedback: doc
    });
    
  } catch (error) {
    res.status(500).json({ 
      error: "Failed to save feedback",
      details: error.message 
    });
  }
});

// Get user's feedback
app.get("/api/feedback/me", verifyFirebaseToken, async (req, res) => {
  try {
    const feedback = await Feedback.find({ 
      farmerId: req.user.uid 
    }).sort({ createdAt: -1 });
    
    res.json(feedback);
  } catch (e) {
    res.status(500).json({ error: "Failed to load feedback" });
  }
});

// ---------------- ADMIN: COMPLAINT MANAGEMENT ----------------
app.get("/api/admin/complaints", verifyFirebaseToken, requireAdmin, async (req, res) => {
  try {
    const list = await Complaint.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/admin/complaints/:id", verifyFirebaseToken, requireAdmin, async (req, res) => {
  try {
    const { status, resolutionNotes } = req.body || {};
    const updated = await Complaint.findByIdAndUpdate(
      req.params.id,
      { status, resolutionNotes },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "Complaint not found" });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------- ADMIN: FEEDBACK VIEW ----------------
app.get("/api/admin/feedback", verifyFirebaseToken, requireAdmin, async (req, res) => {
  try {
    const list = await Feedback.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------- ADMIN: INVENTORY CRUD ----------------
app.post("/api/admin/inventory", verifyFirebaseToken, requireAdmin, async (req, res) => {
  try {
    const { itemName, category, availableQty, unit, price } = req.body;
    
    if (!itemName || !category) {
      return res.status(400).json({ error: "Item name and category are required" });
    }

    const doc = await Inventory.create({
      itemName,
      category,
      availableQty: availableQty || 0,
      unit: unit || "kg",
      price: price || 0
    });
    
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get("/api/admin/inventory", verifyFirebaseToken, requireAdmin, async (req, res) => {
  try {
    const list = await Inventory.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/admin/inventory/:id", verifyFirebaseToken, requireAdmin, async (req, res) => {
  try {
    const updated = await Inventory.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: "Item not found" });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/admin/inventory/:id", verifyFirebaseToken, requireAdmin, async (req, res) => {
  try {
    const del = await Inventory.findByIdAndDelete(req.params.id);
    if (!del) return res.status(404).json({ error: "Item not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------- ADMIN: USERS MANAGEMENT ----------------
app.get("/api/admin/users", verifyFirebaseToken, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/admin/users/:id/toggle", verifyFirebaseToken, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    
    user.isActive = !user.isActive;
    await user.save();
    
    res.json({ success: true, isActive: user.isActive });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------- ADMIN: DELETE FEEDBACK ----------------
app.delete("/api/admin/feedback/:id", verifyFirebaseToken, requireAdmin, async (req, res) => {
  try {
    const deleted = await Feedback.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Feedback not found" });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------- ADMIN: DASHBOARD STATS ----------------
app.get("/api/admin/stats", verifyFirebaseToken, requireAdmin, async (req, res) => {
  try {
    const [
      inventoryCount,
      complaintsCount,
      feedbackCount,
      usersCount,
      pendingComplaints
    ] = await Promise.all([
      Inventory.countDocuments(),
      Complaint.countDocuments(),
      Feedback.countDocuments(),
      User.countDocuments(),
      Complaint.countDocuments({ status: "pending" })
    ]);
    
    res.json({
      inventory: inventoryCount,
      complaints: complaintsCount,
      feedback: feedbackCount,
      users: usersCount,
      pendingComplaints: pendingComplaints
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
      console.log(`📊 API Endpoints:`);
      console.log(`   GET  /api/admin/stats - Admin dashboard stats`);
      console.log(`   GET  /api/admin/users - Admin users management`);
      console.log(`   GET  /api/admin/inventory - Admin inventory`);
      console.log(`   POST /api/admin/inventory - Add inventory item`);
    });
  })
  .catch((e) => {
    console.error("❌ MongoDB connection failed:", e.message);
    process.exit(1);
  });
  const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB (no authentication needed for local)
mongoose.connect('mongodb://127.0.0.1:27017/smartfarmer', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => console.error('❌ MongoDB Error:', err));

// Simple User Schema
const userSchema = new mongoose.Schema({
  email: String,
  name: String,
  role: String,
  isActive: Boolean
}, { timestamps: true });

const inventorySchema = new mongoose.Schema({
  itemName: String,
  category: String,
  quantity: Number,
  unit: String,
  price: Number
}, { timestamps: true });

const complaintSchema = new mongoose.Schema({
  farmerName: String,
  farmerEmail: String,
  title: String,
  message: String,
  status: String,
  resolutionNotes: String
}, { timestamps: true });

const feedbackSchema = new mongoose.Schema({
  farmerName: String,
  farmerEmail: String,
  rating: Number,
  message: String
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Inventory = mongoose.model('Inventory', inventorySchema);
const Complaint = mongoose.model('Complaint', complaintSchema);
const Feedback = mongoose.model('Feedback', feedbackSchema);

// Health check
app.get('/', (req, res) => {
  res.json({ message: '✅ Admin Backend Running' });
});

// ========== DASHBOARD STATS ==========
app.get('/api/admin/stats', async (req, res) => {
  try {
    const [inventory, complaints, feedback, users] = await Promise.all([
      Inventory.countDocuments(),
      Complaint.countDocuments(),
      Feedback.countDocuments(),
      User.countDocuments()
    ]);

    res.json({
      success: true,
      inventory,
      complaints,
      feedback,
      users,
      pendingComplaints: await Complaint.countDocuments({ status: 'pending' })
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== INVENTORY CRUD ==========
app.get('/api/admin/inventory', async (req, res) => {
  try {
    const items = await Inventory.find().sort({ createdAt: -1 });
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/inventory', async (req, res) => {
  try {
    const item = new Inventory(req.body);
    await item.save();
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/admin/inventory/:id', async (req, res) => {
  try {
    const item = await Inventory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/admin/inventory/:id', async (req, res) => {
  try {
    await Inventory.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Item deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== COMPLAINTS ==========
app.get('/api/admin/complaints', async (req, res) => {
  try {
    const complaints = await Complaint.find().sort({ createdAt: -1 });
    res.json({ success: true, data: complaints });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/admin/complaints/:id', async (req, res) => {
  try {
    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json({ success: true, data: complaint });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== FEEDBACK ==========
app.get('/api/admin/feedback', async (req, res) => {
  try {
    const feedback = await Feedback.find().sort({ createdAt: -1 });
    res.json({ success: true, data: feedback });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== USERS ==========
app.get('/api/admin/users', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/admin/users/:id/toggle', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create some dummy data on startup
async function createDummyData() {
  try {
    // Create admin user if doesn't exist
    const adminExists = await User.findOne({ email: 'admin@gmail.com' });
    if (!adminExists) {
      await User.create({
        email: 'admin@gmail.com',
        name: 'Admin User',
        role: 'admin',
        isActive: true
      });
      console.log('✅ Created admin user');
    }

    // Create some dummy inventory
    const inventoryCount = await Inventory.countDocuments();
    if (inventoryCount === 0) {
      await Inventory.insertMany([
        { itemName: 'Urea Fertilizer', category: 'Fertilizer', quantity: 100, unit: 'kg', price: 550 },
        { itemName: 'Wheat Seeds', category: 'Seeds', quantity: 50, unit: 'packet', price: 1200 },
        { itemName: 'Water Pump', category: 'Equipment', quantity: 10, unit: 'piece', price: 8500 },
        { itemName: 'Pesticide Spray', category: 'Pesticide', quantity: 200, unit: 'liter', price: 350 }
      ]);
      console.log('✅ Created dummy inventory');
    }

    // Create some dummy complaints
    const complaintsCount = await Complaint.countDocuments();
    if (complaintsCount === 0) {
      await Complaint.insertMany([
        { 
          farmerName: 'John Farmer', 
          farmerEmail: 'john@example.com',
          title: 'Delivery Delay',
          message: 'My order was delayed by 3 days',
          status: 'pending'
        },
        { 
          farmerName: 'Sarah Smith', 
          farmerEmail: 'sarah@example.com',
          title: 'Product Quality',
          message: 'The seeds quality was not good',
          status: 'in-progress'
        }
      ]);
      console.log('✅ Created dummy complaints');
    }

    // Create some dummy feedback
    const feedbackCount = await Feedback.countDocuments();
    if (feedbackCount === 0) {
      await Feedback.insertMany([
        { 
          farmerName: 'Mike Johnson', 
          farmerEmail: 'mike@example.com',
          rating: 5,
          message: 'Great service! Very helpful staff.'
        },
        { 
          farmerName: 'Emma Wilson', 
          farmerEmail: 'emma@example.com',
          rating: 4,
          message: 'Good products, but delivery could be faster.'
        }
      ]);
      console.log('✅ Created dummy feedback');
    }
  } catch (error) {
    console.error('❌ Dummy data error:', error);
  }
}

// Start server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Admin Backend running at http://localhost:${PORT}`);
  createDummyData();
});
  });