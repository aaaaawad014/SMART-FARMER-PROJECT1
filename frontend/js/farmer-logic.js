// farmer-logic.js - Consolidated and fixed
console.log("🌾 farmer-logic.js loading...");

// Use window property to avoid redeclaration errors
window.API_BASE = window.API_BASE || "http://localhost:3000";

// Helper function to get token
async function getAuthToken() {
  try {
    const user = firebase.auth().currentUser;
    if (!user) {
      console.warn("⚠️ No user logged in");
      throw new Error("Please login first");
    }
    
    const token = await user.getIdToken();
    console.log("✅ Got Firebase token");
    return token;
  } catch (error) {
    console.error("❌ Error getting token:", error);
    throw error;
  }
}

// Generic API call with authentication
async function authApiCall(endpoint, method = "GET", data = null) {
  console.log(`🌐 API ${method} ${endpoint}`);
  
  try {
    const token = await getAuthToken();
    
    const options = {
      method: method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    };
    
    if (data && (method === "POST" || method === "PUT")) {
      options.body = JSON.stringify(data);
    }
    
    const response = await fetch(window.API_BASE + endpoint, options);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`❌ API call failed: ${error.message}`);
    throw error;
  }
}

// ========== CROP FUNCTIONS ==========
window.addCrop = async function(cropData) {
  console.log("🌱 addCrop called with:", cropData);
  
  try {
    const result = await authApiCall("/api/crops", "POST", cropData);
    console.log("✅ Crop added successfully:", result);
    return result;
  } catch (error) {
    console.error("❌ addCrop failed:", error);
    throw error;
  }
};

window.loadCrops = async function() {
  console.log("📋 loadCrops called");
  
  try {
    const crops = await authApiCall("/api/crops", "GET");
    console.log(`✅ Loaded ${crops.length} crops`);
    return crops;
  } catch (error) {
    console.error("❌ loadCrops failed:", error);
    throw error;
  }
};

window.deleteCrop = async function(cropId) {
  console.log("🗑️ deleteCrop called for ID:", cropId);
  
  try {
    const result = await authApiCall(`/api/crops/${cropId}`, "DELETE");
    console.log("✅ Crop deleted successfully");
    return result;
  } catch (error) {
    console.error("❌ deleteCrop failed:", error);
    throw error;
  }
};

// ========== INVENTORY FUNCTIONS ==========
window.loadInventory = async function() {
  console.log("📦 loadInventory called");
  
  try {
    const inventory = await authApiCall("/api/inventory", "GET");
    console.log(`✅ Loaded ${inventory.length} inventory items`);
    return inventory;
  } catch (error) {
    console.error("❌ loadInventory failed:", error);
    throw error;
  }
};

// ========== COMPLAINT FUNCTIONS ==========
window.addComplaint = async function(complaintData) {
  console.log("📝 addComplaint called with:", complaintData);
  
  try {
    const result = await authApiCall("/api/complaints", "POST", complaintData);
    console.log("✅ Complaint added successfully:", result);
    return result;
  } catch (error) {
    console.error("❌ addComplaint failed:", error);
    throw error;
  }
};

window.loadMyComplaints = async function() {
  console.log("📋 loadMyComplaints called");
  
  try {
    const complaints = await authApiCall("/api/complaints/me", "GET");
    console.log(`✅ Loaded ${complaints.length} complaints`);
    return complaints;
  } catch (error) {
    console.error("❌ loadMyComplaints failed:", error);
    throw error;
  }
};

// ========== FEEDBACK FUNCTIONS ==========
window.addFeedback = async function(feedbackData) {
  console.log("🌟 addFeedback called with:", feedbackData);
  
  try {
    const result = await authApiCall("/api/feedback", "POST", feedbackData);
    console.log("✅ Feedback added successfully:", result);
    return result;
  } catch (error) {
    console.error("❌ addFeedback failed:", error);
    throw error;
  }
};

// FIXED: Changed from /api/feedback to /api/feedback/me
window.loadMyFeedback = async function() {
  console.log("📊 loadMyFeedback called");
  
  try {
    const feedback = await authApiCall("/api/feedback/me", "GET");
    console.log(`✅ Loaded ${feedback.length} feedback items`);
    return feedback;
  } catch (error) {
    console.error("❌ loadMyFeedback failed:", error);
    throw error;
  }
};

// ========== VERIFY FUNCTIONS ARE LOADED ==========
console.log("✅ farmer-logic.js loaded successfully!");
console.log("📋 Available functions:");
console.log("  • addCrop:", typeof window.addCrop === 'function' ? '✅' : '❌');
console.log("  • loadCrops:", typeof window.loadCrops === 'function' ? '✅' : '❌');
console.log("  • deleteCrop:", typeof window.deleteCrop === 'function' ? '✅' : '❌');
console.log("  • loadInventory:", typeof window.loadInventory === 'function' ? '✅' : '❌');
console.log("  • addComplaint:", typeof window.addComplaint === 'function' ? '✅' : '❌');
console.log("  • loadMyComplaints:", typeof window.loadMyComplaints === 'function' ? '✅' : '❌');
console.log("  • addFeedback:", typeof window.addFeedback === 'function' ? '✅' : '❌');
console.log("  • loadMyFeedback:", typeof window.loadMyFeedback === 'function' ? '✅' : '❌');