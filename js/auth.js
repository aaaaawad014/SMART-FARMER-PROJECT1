// frontend/js/auth.js

function popupAlert(msg) {
  alert(msg);
}

async function getIdTokenOrThrow() {
  const user = firebase.auth().currentUser;
  if (!user) throw new Error("Not logged in");
  return await user.getIdToken();
}

function requireLogin(redirectTo = "login.html") {
  firebase.auth().onAuthStateChanged((user) => {
    if (!user) window.location.href = redirectTo;
  });
}

function logout(redirectTo = "../index.html") {
  return firebase.auth().signOut().then(() => {
    window.location.href = redirectTo;
  });
}

// OPTIONAL: Quick sign-in helper if you want
async function loginWithEmailPassword(email, password) {
  return auth.signInWithEmailAndPassword(email, password);
}
