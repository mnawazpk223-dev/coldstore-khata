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
    updateDoc,
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
let allTransactions = [];

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

// Firebase Auth State Observer
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        authSection.style.display = "none";
        appDashboard.style.display = "block";
        userEmailDisplay.innerText = `Logged in: ${user.email}`;
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

// Add / Update Khata Entry Handler
const entryForm = document.getElementById("entry-form");
const formTitle = document.getElementById("form-title");
const editEntryIdInput = document.getElementById("edit-entry-id");
const cancelEditBtn = document.getElementById("cancel-edit-btn");

entryForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const customerName = document.getElementById("customer-name").value;
    const itemDesc = document.getElementById("item-desc").value;
    const amount = parseFloat(document.getElementById("amount").value);
    const editId = editEntryIdInput.value;

    const now = new Date();
    const entryData = {
        customerName,
        itemDesc,
        amount,
        date: now.toLocaleDateString() + " " + now.toLocaleTimeString(),
        timestamp: now.getTime()
    };

    try {
        if (editId) {
            await updateDoc(doc(db, `users/${currentUser.uid}/khata`, editId), entryData);
            alert("Entry updated successfully!");
            resetFormState();
        } else {
            await addDoc(collection(db, `users/${currentUser.uid}/khata`), entryData);
            
            if (Notification.permission === "granted") {
                new Notification("New Khata Entry Added", {
                    body: `${customerName} - ${itemDesc} (${amount.toFixed(3)} BHD)`,
                    icon: "https://cdn-icons-png.flaticon.com/512/2910/2910791.png"
                });
            }
        }
        entryForm.reset();
    } catch (error) {
        alert("Error saving entry: " + error.message);
    }
});

cancelEditBtn?.addEventListener("click", () => {
    resetFormState();
    entryForm.reset();
});

function resetFormState() {
    editEntryIdInput.value = "";
    formTitle.innerText = "Add New Entry";
    cancelEditBtn.style.display = "none";
}

// Load Khata Data from Firestore
function loadKhataData(uid) {
    const q = query(collection(db, `users/${uid}/khata`), orderBy("timestamp", "desc"));
    
    onSnapshot(q, (snapshot) => {
        allTransactions = [];
        snapshot.forEach((docSnap) => {
            allTransactions.push({ id: docSnap.id, ...docSnap.data() });
        });
        renderTable(allTransactions);
    });
}

// Render Table Function
function renderTable(dataArray) {
    let rows = "";
    dataArray.forEach((data) => {
        rows += `
            <tr>
                <td>${data.date}</td>
                <td>${data.customerName}</td>
                <td>${data.itemDesc}</td>
                <td>${data.amount.toFixed(3)} BHD</td>
                <td>
                    <div class="action-btns">
                        <button onclick="window.editEntry('${data.id}', '${data.customerName}', '${data.itemDesc}', ${data.amount})" class="edit-btn">Edit</button>
                        <button onclick="window.deleteEntry('${data.id}')" class="delete-btn">Delete</button>
                    </div>
                </td>
            </tr>
        `;
    });
    document.getElementById("table-body").innerHTML = rows;
}

// Search Filter Handler
document.getElementById("search-box")?.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allTransactions.filter(item => 
        item.customerName.toLowerCase().includes(term) || 
        item.itemDesc.toLowerCase().includes(term)
    );
    renderTable(filtered);
});

// Edit Setup Function
window.editEntry = (id, customerName, itemDesc, amount) => {
    editEntryIdInput.value = id;
    document.getElementById("customer-name").value = customerName;
    document.getElementById("item-desc").value = itemDesc;
    document.getElementById("amount").value = amount;
    formTitle.innerText = "Edit Entry";
    cancelEditBtn.style.display = "inline-block";
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

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

// --- Download PDF Function ---
document.getElementById("download-pdf-btn")?.addEventListener("click", () => {
    const { jsPDF } = window.jspdf;
    const docPdf = new jsPDF();

    docPdf.setFont("helvetica", "bold");
    docPdf.setFontSize(18);
    docPdf.text("Cold Store Daily Khata Statement", 14, 20);

    docPdf.setFontSize(11);
    docPdf.setFont("helvetica", "normal");
    docPdf.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);

    let y = 40;
    docPdf.setFont("helvetica", "bold");
    docPdf.text("Date", 14, y);
    docPdf.text("Customer", 55, y);
    docPdf.text("Description", 105, y);
    docPdf.text("Amount (BHD)", 160, y);

    docPdf.line(14, y + 2, 196, y + 2);
    y += 8;

    docPdf.setFont("helvetica", "normal");
    let totalAmount = 0;

    allTransactions.forEach((item) => {
        if (y > 270) {
            docPdf.addPage();
            y = 20;
        }
        docPdf.text(item.date.substring(0, 10), 14, y);
        docPdf.text(item.customerName.substring(0, 18), 55, y);
        docPdf.text(item.itemDesc.substring(0, 22), 105, y);
        docPdf.text(item.amount.toFixed(3), 160, y);
        totalAmount += item.amount;
        y += 8;
    });

    docPdf.line(14, y + 2, 196, y + 2);
    y += 10;
    docPdf.setFont("helvetica", "bold");
    docPdf.text(`Total Balance: ${totalAmount.toFixed(3)} BHD`, 140, y, { align: "right" });

    docPdf.save("ColdStore_Khata_Statement.pdf");
});

// --- PWA Install Prompt Logic ---
let deferredPrompt;
const installBtn = document.getElementById("install-btn");

window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) {
        installBtn.style.display = "inline-block";
    }
});

installBtn?.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
        console.log("User accepted the install prompt");
    }
    deferredPrompt = null;
    installBtn.style.display = "none";
});

window.addEventListener("appinstalled", () => {
    if (installBtn) {
        installBtn.style.display = "none";
    }
});
