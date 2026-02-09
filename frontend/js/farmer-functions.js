// frontend/js/farmer-functions.js
// ALL-IN-ONE SOLUTION - No dependencies, just copy and paste!

console.log("🚀 FARMER FUNCTIONS LOADING...");

// ========== CONFIGURATION ==========
const API_BASE_URL = "http://localhost:3000";
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCeScZUZii7ef6Ou_Hptv_gSqnPASOMXVk",
  authDomain: "smartfarmersystem-5c9ee.firebaseapp.com",
  databaseURL: "https://smartfarmersystem-5c9ee-default-rtdb.firebaseio.com",
  projectId: "smartfarmersystem-5c9ee",
  storageBucket: "smartfarmersystem-5c9ee.firebasestorage.app",
  messagingSenderId: "814146849558",
  appId: "1:814146849558:web:4391c0c2960321d17cde37",
  measurementId: "G-KNDV2VDCE4"
};

// ========== FIREBASE INITIALIZATION ==========
let firebaseInitialized = false;

function initializeFirebase() {
  if (typeof firebase === 'undefined') {
    console.error("❌ Firebase SDK not loaded!");
    return false;
  }
  
  if (!firebase.apps.length) {
    firebase.initializeApp(FIREBASE_CONFIG);
    console.log("✅ Firebase initialized");
    firebaseInitialized = true;
  } else {
    console.log("✅ Firebase already initialized");
    firebaseInitialized = true;
  }
  
  return firebaseInitialized;
}

// Initialize immediately
initializeFirebase();

// ========== AUTHENTICATION FUNCTIONS ==========

// Get current user
function getCurrentUser() {
  if (!firebaseInitialized) {
    console.error("❌ Firebase not initialized");
    return null;
  }
  return firebase.auth().currentUser;
}

// Get Firebase token
async function getFirebaseToken() {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error("User not logged in");
    }
    const token = await user.getIdToken();
    console.log("✅ Got Firebase token");
    return token;
  } catch (error) {
    console.error("❌ Failed to get token:", error);
    throw error;
  }
}

// Check if user is logged in
function isLoggedIn() {
  return getCurrentUser() !== null;
}

// Require login (redirect if not logged in)
function requireLogin(redirectUrl) {
  console.log(`🔒 Checking login, redirect to: ${redirectUrl}`);
  
  firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
      console.log("❌ Not logged in, redirecting...");
      window.location.href = redirectUrl;
    } else {
      console.log(`✅ User logged in: ${user.email}`);
    }
  });
}

// Logout
async function logout(redirectUrl = "../index.html") {
  try {
    console.log("🚪 Logging out...");
    await firebase.auth().signOut();
    localStorage.clear();
    sessionStorage.clear();
    console.log("✅ Logged out successfully");
    window.location.href = redirectUrl;
  } catch (error) {
    console.error("❌ Logout failed:", error);
    window.location.href = redirectUrl;
  }
}

// ========== API CALL FUNCTION ==========
async function callApi(endpoint, method = "GET", data = null) {
  console.log(`📡 API Call: ${method} ${endpoint}`);
  
  try {
    // Get Firebase token
    const token = await getFirebaseToken();
    
    // Prepare request
    const requestOptions = {
      method: method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    };
    
    // Add body for POST/PUT/DELETE
    if (data && ["POST", "PUT", "DELETE"].includes(method)) {
      requestOptions.body = JSON.stringify(data);
    }
    
    // Make request
    const response = await fetch(`${API_BASE_URL}${endpoint}`, requestOptions);
    
    // Check response
    if (!response.ok) {
      let errorMsg = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMsg = errorData.error || errorData.message || errorMsg;
      } catch (e) {
        // Couldn't parse error JSON
      }
      throw new Error(errorMsg);
    }
    
    // For DELETE with no content
    if (response.status === 204) {
      return { success: true };
    }
    
    // Parse response
    return await response.json();
    
  } catch (error) {
    console.error(`❌ API Call failed: ${error.message}`);
    
    // Handle auth errors
    if (error.message.includes("401") || error.message.includes("token")) {
      console.log("⚠️ Auth error, redirecting to login");
      window.location.href = "login.html";
    }
    
    throw error;
  }
}

// ========== CROP FUNCTIONS ==========

// ADD CROP - This is the function you need!
window.addCrop = async function(cropData) {
  console.log("🌱 Adding crop:", cropData);
  
  // Validate
  if (!cropData.cropName || !cropData.season) {
    throw new Error("Crop Name and Season are required");
  }
  
  // Prepare data
  const data = {
    cropName: String(cropData.cropName).trim(),
    season: String(cropData.season).trim(),
    area: Number(cropData.area) || 0,
    quantity: Number(cropData.quantity) || 0
  };
  
  // Make API call
  return await callApi("/api/crops", "POST", data);
};

// LOAD CROPS
window.loadCrops = async function() {
  console.log("📋 Loading crops...");
  return await callApi("/api/crops", "GET");
};

// DELETE CROP
window.deleteCrop = async function(cropId) {
  console.log("🗑️ Deleting crop:", cropId);
  
  if (!cropId) {
    throw new Error("Crop ID is required");
  }
  
  return await callApi(`/api/crops/${cropId}`, "DELETE");
};

// ========== INVENTORY FUNCTIONS ==========

// LOAD INVENTORY
window.loadInventory = async function() {
  console.log("📦 Loading inventory...");
  return await callApi("/api/inventory", "GET");
};

// ========== COMPLAINT FUNCTIONS ==========

window.createComplaint = async function(complaintData) {
  console.log("📝 Creating complaint...");
  
  if (!complaintData.title || !complaintData.message) {
    throw new Error("Title and Message are required");
  }
  
  const data = {
    title: String(complaintData.title).trim(),
    message: String(complaintData.message).trim()
  };
  
  return await callApi("/api/complaints", "POST", data);
};

window.loadMyComplaints = async function() {
  console.log("📋 Loading complaints...");
  return await callApi("/api/complaints/me", "GET");
};

// ========== FEEDBACK FUNCTIONS ==========

window.sendFeedback = async function(feedbackData) {
  console.log("⭐ Sending feedback...");
  
  const data = {
    rating: Number(feedbackData.rating) || 5,
    message: String(feedbackData.message || "").trim()
  };
  
  return await callApi("/api/feedback", "POST", data);
};

// ========== USER FUNCTIONS ==========

window.getUserProfile = async function() {
  console.log("👤 Getting profile...");
  return await callApi("/api/users/me", "GET");
};

window.updateUserProfile = async function(name) {
  console.log("✏️ Updating profile...");
  return await callApi("/api/users/upsert", "POST", { name: String(name).trim() });
};

// ========== TEST FUNCTION ==========

window.testBackend = async function() {
  console.log("🔗 Testing backend connection...");
  
  try {
    const response = await fetch(`${API_BASE_URL}/`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log("✅ Backend is running:", data);
      return true;
    } else {
      console.error("❌ Backend not responding");
      return false;
    }
  } catch (error) {
    console.error("❌ Connection test failed:", error);
    return false;
  }
};

// ========== INITIALIZATION CHECK ==========

// Wait for Firebase to load
setTimeout(() => {
  console.log("=".repeat(50));
  console.log("✅ FARMER FUNCTIONS LOADED SUCCESSFULLY!");
  console.log("📋 AVAILABLE FUNCTIONS:");
  console.log("   • addCrop:", typeof window.addCrop);
  console.log("   • loadCrops:", typeof window.loadCrops);
  console.log("   • deleteCrop:", typeof window.deleteCrop);
  console.log("   • loadInventory:", typeof window.loadInventory);
  console.log("   • createComplaint:", typeof window.createComplaint);
  console.log("   • sendFeedback:", typeof window.sendFeedback);
  console.log("   • requireLogin:", typeof window.requireLogin);
  console.log("   • logout:", typeof window.logout);
  console.log("=".repeat(50));
  
  // Test if functions are properly exported
  if (typeof window.addCrop !== 'function') {
    console.error("❌ CRITICAL ERROR: addCrop not exported!");
  } else {
    console.log("🎉 READY TO USE! Try: await addCrop({cropName: 'Wheat', season: 'Rabi', area: 5})");
  }
}, 1000);

// Export all functions to window
window.requireLogin = requireLogin;
window.logout = logout;
window.isLoggedIn = isLoggedIn;
window.testBackend = testBackend;

console.log("✅ All functions exported to window object");
// ========== FIX: MISSING AUTH API FUNCTION ==========
// Add this function to fix the missing authApiCall
async function makeApiCall(endpoint, method = "GET", data = null) {
    console.log(`🌐 API Call: ${method} ${endpoint}`);
    
    try {
        // Get current user
        const user = firebase.auth().currentUser;
        if (!user) {
            throw new Error("User not logged in");
        }
        
        // Get token
        const token = await user.getIdToken();
        
        // Prepare request
        const options = {
            method: method,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        };
        
        // Add body if needed
        if (data && ["POST", "PUT", "DELETE"].includes(method)) {
            options.body = JSON.stringify(data);
        }
        
        // Make request
        const response = await fetch(`http://localhost:3000${endpoint}`, options);
        
        // Check response
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        
        // For DELETE (no content)
        if (response.status === 204) {
            return { success: true };
        }
        
        // Return data
        return await response.json();
        
    } catch (error) {
        console.error(`❌ API call failed: ${error.message}`);
        
        // Handle auth errors
        if (error.message.includes("401") || error.message.includes("auth")) {
            console.log("⚠️ Auth error, redirecting to login");
            window.location.href = "login.html";
        }
        
        throw error;
    }
}

// Override loadInventory to use the correct API call
window.loadInventory = async function() {
    console.log("📦 Loading inventory...");
    return await makeApiCall("/api/inventory", "GET");
};

// Also make sure requireLogin and logout work
// (These should already be defined in your file)

console.log("✅ Farmer Functions Enhanced - Inventory loading fixed!");
// ========== COMPLAINTS FUNCTIONS ==========
async function loadMyComplaints() {
  console.log("📋 Loading my complaints...");
  
  try {
    const user = firebase.auth().currentUser;
    if (!user) {
      throw new Error("Please login first");
    }
    
    const token = await user.getIdToken();
    
    const response = await fetch("http://localhost:3000/api/complaints/me", {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to load complaints: ${response.status} - ${errorText}`);
    }
    
    const complaints = await response.json();
    console.log(`✅ Loaded ${complaints.length} complaints`);
    return complaints;
    
  } catch (error) {
    console.error("❌ Failed to load complaints:", error);
    throw error;
  }
}

// Export to window
window.loadMyComplaints = loadMyComplaints;