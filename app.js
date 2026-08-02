import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    onSnapshot, 
    query, 
    orderBy, 
    deleteDoc, 
    doc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Your exact Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDizPXfz3urzxBJOJ2rEC9LBtLhNK3J6-w",
  authDomain: "coldstorekhata.firebaseapp.com",
  databaseURL: "https://coldstorekhata-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "coldstorekhata",
  storageBucket: "coldstorekhata.firebasestorage.app",
  messagingSenderId: "502742556617",
  appId: "1:502742556617:web:f46accc9816dc185fa5218",
  measurementId: "G-X3G1EEZ4N8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;

// UI Elements & Tabs Switching
const showLoginBtn = document.getElementById("show-login-btn");
const showSignupBtn = document.getElementById("show-signup-btn");
const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const authSection = document.getElementById("auth-section");
const appDashboard = document.getElementById("app-dashboard");
const userEmailDisplay = document.getElementById("user-email-display");

if (showLoginBtn && showSignupBtn) {
    showLoginBtn.addEventListener("click", () => {
        loginForm.style.display = "block";
        signupForm.style.display = "none";
        showLoginBtn.classList.add("active");
        showSignupBtn.classList.remove("active");
    });

    showSignupBtn.addEventListener("click", () => {
        signupForm.style.display = "block";
        loginForm.style.display = "none";
        showSignupBtn.classList.add("active");
        showLoginBtn.classList.remove("active");
    });
}

// Firebase Auth State Observer (Check if user is logged in)
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        authSection.style.display = "none";
        appDashboard.style.display = "block";
        userEmailDisplay.innerText = `Logged in as: ${user.email}`;
        loadKhataData(user.uid);
    } else {
        currentUser = null;
        authSection.style.display = "block";
        appDashboard.style.display = "none";
    }
});

// Sign Up Handler
signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("signup-email").value;
    const password = document.getElementById("signup-password").value;

    try {
        await createUserWithEmailAndPassword(auth, email, password);
        alert("Account created successfully!");
    } catch (error) {
        alert("Sign Up Error: " + error.message);
    }
});

// Login Handler
loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        alert("Login Error: " + error.message);
    }
});

// Logout Handler
document.getElementById("logout-btn").addEventListener("click", async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Logout Error", error);
    }
});

// Add Khata Entry Handler
const entryForm = document.getElementById("entry-form");
entryForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const customerName = document.getElementById("customer-name").value;
    const itemDesc = document.getElementById("item-desc").value;
    const amount = parseFloat(document.getElementById("amount").value);

    const now = new Date();
    const entryData = {
        customerName,
        itemDesc,
        amount,
        date: now.toLocaleDateString() + " " + now.toLocaleTimeString(),
        timestamp: now.getTime()
    };

    try {
        await addDoc(collection(db, `users/${currentUser.uid}/khata`), entryData);
        entryForm.reset();
    } catch (error) {
        alert("Error adding entry: " + error.message);
    }
});

// Load Khata Data from Firestore
function loadKhataData(uid) {
    const q = query(collection(db, `users/${uid}/khata`), orderBy("timestamp", "desc"));
    
    onSnapshot(q, (snapshot) => {
        let rows = "";
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;

            rows += `
                <tr>
                    <td>${data.date}</td>
                    <td>${data.customerName}</td>
                    <td>${data.itemDesc}</td>
                    <td>${data.amount.toFixed(3)} BHD</td>
                    <td><button onclick="window.deleteEntry('${id}')" class="delete-btn">Delete</button></td>
                </tr>
            `;
        });
        document.getElementById("table-body").innerHTML = rows;
    });
}

// Delete Entry Function
window.deleteEntry = async (id) => {
    if (confirm("Are you sure you want to delete this entry?") && currentUser) {
        try {
            await deleteDoc(doc(db, `users/${currentUser.uid}/khata`, id));
        } catch (error) {
            alert("Error deleting entry: " + error.message);
        }
    }
};
