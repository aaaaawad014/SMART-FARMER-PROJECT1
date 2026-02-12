// frontend/js/fix-inventory.js - SIMPLE FIX FOR INVENTORY PAGES
console.log("🔧 Inventory Fix Script Loading...");

// Wait for Firebase and other scripts to load
setTimeout(() => {
    console.log("✅ Scripts loaded, checking inventory functions...");
    
    // ========== FIX 1: Ensure loadInventory exists ==========
    if (typeof window.loadInventory === 'undefined') {
        console.warn("⚠️ loadInventory not found, creating it...");
        
        window.loadInventory = async function() {
            console.log("📦 Loading inventory (fallback function)...");
            
            try {
                // Get current user
                const user = firebase.auth().currentUser;
                if (!user) {
                    throw new Error("Please login first");
                }
                
                console.log(`👤 User: ${user.email}`);
                
                // Get Firebase token
                const token = await user.getIdToken();
                
                // Call backend API
                const response = await fetch("http://localhost:3000/api/inventory", {
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                console.log(`✅ Got ${Array.isArray(data) ? data.length : 0} inventory items`);
                return Array.isArray(data) ? data : [];
                
            } catch (error) {
                console.error("❌ Failed to load inventory:", error);
                throw error;
            }
        };
        
        console.log("✅ Created loadInventory function");
    } else {
        console.log("✅ loadInventory function already exists");
    }
    
    // ========== FIX 2: Ensure requireLogin exists ==========
    if (typeof window.requireLogin === 'undefined') {
        console.warn("⚠️ requireLogin not found, creating it...");
        
        window.requireLogin = function(redirectUrl = "login.html") {
            console.log("🔒 Checking login (fallback)...");
            
            firebase.auth().onAuthStateChanged((user) => {
                if (!user) {
                    console.log("❌ Not logged in, redirecting...");
                    window.location.href = redirectUrl;
                } else {
                    console.log(`✅ User logged in: ${user.email}`);
                }
            });
        };
    }
    
    // ========== FIX 3: Ensure logout exists ==========
    if (typeof window.logout === 'undefined') {
        console.warn("⚠️ logout not found, creating it...");
        
        window.logout = async function(redirectUrl = "../index.html") {
            try {
                console.log("🚪 Logging out...");
                await firebase.auth().signOut();
                window.location.href = redirectUrl;
            } catch (error) {
                console.error("❌ Logout error:", error);
                window.location.href = redirectUrl;
            }
        };
    }
    
    // ========== TEST FUNCTIONS ==========
    window.testInventory = async function() {
        console.log("🧪 Testing inventory loading...");
        
        try {
            const inventory = await loadInventory();
            console.log("✅ Test successful! Inventory:", inventory);
            console.log(`📊 Count: ${inventory.length} items`);
            
            if (inventory.length > 0) {
                console.log("📋 First item:", inventory[0]);
            }
            
            return inventory;
        } catch (error) {
            console.error("❌ Test failed:", error);
            return [];
        }
    };
    
    console.log("🔧 All fixes applied!");
    console.log("📋 Available functions:");
    console.log("  • loadInventory:", typeof window.loadInventory);
    console.log("  • requireLogin:", typeof window.requireLogin);
    console.log("  • logout:", typeof window.logout);
    console.log("  • testInventory:", typeof window.testInventory);
    
}, 1000);