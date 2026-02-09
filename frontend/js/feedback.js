// feedback.js - Frontend feedback functions
console.log("🌟 feedback.js loading...");

// Use existing API_BASE or set it
window.API_BASE = window.API_BASE || "http://localhost:3000";

// Helper to get auth token
async function getAuthToken() {
  try {
    const user = firebase.auth().currentUser;
    if (!user) {
      throw new Error("Please login first");
    }
    return await user.getIdToken();
  } catch (error) {
    console.error("❌ Error getting token:", error);
    throw error;
  }
}

// 1. Submit Feedback Function
window.submitFeedback = async function(feedbackData) {
  console.log("📝 submitFeedback called with:", feedbackData);
  
  try {
    // Validate data
    if (!feedbackData.message || feedbackData.message.trim() === '') {
      throw new Error("Feedback message is required");
    }
    
    const token = await getAuthToken();
    
    const response = await fetch(`${window.API_BASE}/api/feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        rating: parseInt(feedbackData.rating) || 5,
        message: feedbackData.message.trim()
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Server response:", errorText);
      throw new Error(`Failed to submit feedback: ${response.status}`);
    }
    
    const result = await response.json();
    console.log("✅ Feedback submitted:", result);
    return result;
    
  } catch (error) {
    console.error("❌ submitFeedback failed:", error);
    throw error;
  }
};

// 2. Get User's Feedback
window.getMyFeedback = async function() {
  console.log("📋 getMyFeedback called");
  
  try {
    const token = await getAuthToken();
    
    const response = await fetch(`${window.API_BASE}/api/feedback/me`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to load feedback: ${response.status}`);
    }
    
    const feedback = await response.json();
    console.log(`✅ Loaded ${feedback.length} feedback entries`);
    return feedback;
    
  } catch (error) {
    console.error("❌ getMyFeedback failed:", error);
    throw error;
  }
};

// 3. Display Feedback History (Helper function)
window.displayFeedbackHistory = function(feedbackList, containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn("⚠️ Container not found:", containerId);
    return;
  }
  
  if (!feedbackList || feedbackList.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: rgba(234, 242, 255, 0.5);">
        No feedback submitted yet.
      </div>
    `;
    return;
  }
  
  const html = feedbackList.map(feedback => {
    const date = new Date(feedback.createdAt);
    const formattedDate = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const stars = '★'.repeat(feedback.rating || 5) + '☆'.repeat(5 - (feedback.rating || 5));
    
    return `
      <div style="
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 12px;
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="color: rgba(234, 242, 255, 0.6); font-size: 13px;">
            ${formattedDate}
          </span>
          <span style="color: #ffaa00; font-weight: bold;">
            ${stars}
          </span>
        </div>
        <div style="color: #eaf2ff; line-height: 1.5; white-space: pre-wrap;">
          ${escapeHtml(feedback.message)}
        </div>
      </div>
    `;
  }).join('');
  
  container.innerHTML = html;
};

// 4. Simple Alert Function
window.showFeedbackAlert = function(message, type = 'success') {
  const alertDiv = document.createElement('div');
  alertDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 8px;
    background: ${type === 'success' ? 'rgba(0, 214, 143, 0.15)' : 'rgba(255, 71, 87, 0.15)'};
    border: 1px solid ${type === 'success' ? 'rgba(0, 214, 143, 0.3)' : 'rgba(255, 71, 87, 0.3)'};
    color: ${type === 'success' ? '#00d68f' : '#ff4757'};
    z-index: 1000;
    font-weight: 500;
    backdrop-filter: blur(10px);
    animation: slideIn 0.3s ease;
  `;
  
  // Add animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
  
  alertDiv.textContent = message;
  document.body.appendChild(alertDiv);
  
  setTimeout(() => {
    alertDiv.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => document.body.removeChild(alertDiv), 300);
  }, 3000);
};

// Helper to escape HTML
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Verify functions are loaded
console.log("✅ feedback.js loaded successfully!");
console.log("📋 Available functions:");
console.log("  • submitFeedback:", typeof window.submitFeedback === 'function' ? '✅' : '❌');
console.log("  • getMyFeedback:", typeof window.getMyFeedback === 'function' ? '✅' : '❌');
console.log("  • displayFeedbackHistory:", typeof window.displayFeedbackHistory === 'function' ? '✅' : '❌');
console.log("  • showFeedbackAlert:", typeof window.showFeedbackAlert === 'function' ? '✅' : '❌');