import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { 
    getDatabase, 
    ref, 
    push, 
    set, 
    update, 
    remove, 
    onValue 
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";

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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Keep user logged in across sessions/refreshes automatically (No auto-logout)
setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.error("Auth persistence error:", error);
});

const database = getDatabase(app);
const dbRef = ref(database, 'khata_entries');

let isSignUp = false;
let lastDeletedEntry = null;
let undoTimeout = null;
let notifTimeout = null;
let allData = [];
let isInitialLoad = true;

// --- SERVICE WORKER REGISTRATION FOR PUSH NOTIFICATIONS ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((reg) => {
                console.log('Service Worker registered:', reg.scope);
                askNotificationPermission();
            })
            .catch((err) => {
                console.error('Service Worker registration failed:', err);
            });
    });
}

function askNotificationPermission() {
    if ('Notification' in window && Notification.permission !== 'granted') {
        Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
                console.log('Notification permission granted.');
            }
        });
    }
}

// --- PWA INSTALL PROMPT (Android & iOS) ---
let deferredPrompt;
const installContainer = document.getElementById('installContainer');
const installAppBtn = document.getElementById('installAppBtn');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if(installContainer) installContainer.style.display = 'block';
});

if(installAppBtn) {
    installAppBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                if(installContainer) installContainer.style.display = 'none';
            }
            deferredPrompt = null;
        } else {
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            if (isIOS) {
                alert("To install on iOS: Tap the Share button (box with arrow) at the bottom of Safari and select 'Add to Home Screen'.");
            } else {
                alert("App is already installed or your browser doesn't support direct installation. Use browser menu to 'Add to Home Screen'.");
            }
        }
    });
}

// --- TOGGLE AUTH ---
const switchAuth = document.getElementById('switchAuth');
if(switchAuth) {
    switchAuth.addEventListener('click', (e) => {
        e.preventDefault();
        isSignUp = !isSignUp;
        document.getElementById('authTitle').innerText = isSignUp ? "Sign Up for Khata" : "Login to Khata";
        document.getElementById('authBtn').innerText = isSignUp ? "Create Account" : "Sign In";
        switchAuth.innerText = isSignUp ? "Login" : "Sign Up";
        document.getElementById('toggleAuth').firstChild.textContent = isSignUp ? "Already have an account? " : "Don't have an account? ";
    });
}

// --- AUTH SUBMIT ---
document.getElementById('authForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('authEmail').value;
    const pass = document.getElementById('authPassword').value;

    if (isSignUp) {
        createUserWithEmailAndPassword(auth, email, pass)
            .then(() => alert("Account created successfully!"))
            .catch(err => alert(err.message));
    } else {
        signInWithEmailAndPassword(auth, email, pass)
            .catch(err => alert(err.message));
    }
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('authContainer').style.display = 'none';
        document.getElementById('appContainer').style.display = 'block';
        loadData();
    } else {
        document.getElementById('authContainer').style.display = 'block';
        document.getElementById('appContainer').style.display = 'none';
    }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
    signOut(auth);
});

// --- CLOCK ---
setInterval(() => {
    const clock = document.getElementById('clock');
    if (clock) clock.innerText = new Date().toLocaleString();
}, 1000);

// --- ADD / EDIT ENTRY (With Default 0 Check for Blank Fields) ---
document.getElementById('khataForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const editId = document.getElementById('editId').value;
    const item = document.getElementById('itemName').value;
    const desc = document.getElementById('desc').value;
    
    let priceInput = document.getElementById('price').value;
    let paidInput = document.getElementById('paid').value;

    // Agar field khali ho toh default 0 set ho jaye ga
    const price = priceInput === "" ? 0 : parseFloat(priceInput);
    const paid = paidInput === "" ? 0 : parseFloat(paidInput);
    
    const balance = price - paid;
    const time = new Date().toLocaleString();

    if (editId) {
        update(ref(database, 'khata_entries/' + editId), { item, desc, price, paid, balance });
    } else {
        push(dbRef, { item, desc, price, paid, balance, time });
    }
    resetForm();
});

function resetForm() {
    document.getElementById('khataForm').reset();
    document.getElementById('editId').value = '';
    document.getElementById('formTitle').innerText = 'Add New Entry';
    document.getElementById('saveBtn').innerText = '➕ Save & Sync Entry';
    document.getElementById('cancelEditBtn').style.display = 'none';
}

document.getElementById('cancelEditBtn').addEventListener('click', resetForm);

// --- LOAD DATA & LIVE SYNC ACROSS ALL DEVICES WITH NOTIFICATIONS ---
function loadData() {
    onValue(dbRef, (snapshot) => {
        const tableBody = document.getElementById('tableBody');
        tableBody.innerHTML = '';
        let tPrice = 0, tPaid = 0, tBal = 0;
        allData = [];

        const data = snapshot.val();
        if (data) {
            const keys = Object.keys(data);
            const lastKey = keys[keys.length - 1];

            for (let id in data) {
                const row = data[id];
                row.id = id;
                allData.push(row);

                tPrice += row.price;
                tPaid += row.paid;
                tBal += row.balance;

                // Trigger notification on all devices when a new entry is added
                if (id === lastKey && !isInitialLoad) {
                    showInAppNotification(`✨ New Entry Added: ${row.item} (BD ${row.price.toFixed(3)})`);
                }

                tableBody.innerHTML += `
                    <tr>
                        <td><small>${row.time}</small></td>
                        <td><b>${row.item}</b></td>
                        <td>${row.desc}</td>
                        <td>BD ${row.price.toFixed(3)}</td>
                        <td style="color:green; font-weight:bold;">BD ${row.paid.toFixed(3)}</td>
                        <td style="color:red; font-weight:bold;">BD ${row.balance.toFixed(3)}</td>
                        <td>
                            <button class="edit-btn" data-id="${id}">✏️</button>
                            <button class="del-btn" data-id="${id}">X</button>
                        </td>
                    </tr>
                `;
            }
        }

        isInitialLoad = false;

        document.getElementById('totalPrice').innerText = `BD ${tPrice.toFixed(3)}`;
        document.getElementById('totalPaid').innerText = `BD ${tPaid.toFixed(3)}`;
        document.getElementById('totalBalance').innerText = `BD ${tBal.toFixed(3)}`;

        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const itemData = allData.find(d => d.id === id);
                if (itemData) {
                    document.getElementById('editId').value = id;
                    document.getElementById('itemName').value = itemData.item;
                    document.getElementById('desc').value = itemData.desc;
                    document.getElementById('price').value = itemData.price;
                    document.getElementById('paid').value = itemData.paid;
                    document.getElementById('formTitle').innerText = '✏️ Edit Entry';
                    document.getElementById('saveBtn').innerText = '🔄 Update Entry';
                    document.getElementById('cancelEditBtn').style.display = 'block';
                }
            });
        });

        document.querySelectorAll('.del-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const itemData = allData.find(d => d.id === id);
                if (itemData && confirm("Are you sure you want to delete this entry?")) {
                    lastDeletedEntry = itemData;
                    remove(ref(database, 'khata_entries/' + id));
                    
                    const toast = document.getElementById('undoToast');
                    toast.style.display = 'flex';
                    clearTimeout(undoTimeout);
                    undoTimeout = setTimeout(() => {
                        toast.style.display = 'none';
                        lastDeletedEntry = null;
                    }, 7000);
                }
            });
        });
    });
}

// --- IN-APP NOTIFICATION BANNER FUNCTION ---
function showInAppNotification(message) {
    const notif = document.getElementById('liveNotification');
    const notifText = document.getElementById('notifText');
    if(notif && notifText) {
        notifText.innerText = message;
        notif.style.display = 'block';
        
        clearTimeout(notifTimeout);
        notifTimeout = setTimeout(() => {
            notif.style.display = 'none';
        }, 5000);
    }
}

// --- UNDO DELETE ---
document.getElementById('undoBtn').addEventListener('click', () => {
    if (lastDeletedEntry) {
        const id = lastDeletedEntry.id;
        delete lastDeletedEntry.id;
        set(ref(database, 'khata_entries/' + id), lastDeletedEntry);
        lastDeletedEntry = null;
        document.getElementById('undoToast').style.display = 'none';
    }
});

// --- RESET ALL ---
document.getElementById('resetAllBtn').addEventListener('click', () => {
    if (confirm("⚠️ WARNING: Clear entire Khata?")) {
        if (confirm("FINAL CONFIRMATION: Delete permanently?")) {
            remove(dbRef);
        }
    }
});

// --- PDF DOWNLOAD ---
document.getElementById('pdfBtn').addEventListener('click', () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Cold Store Daily Khata Balance Sheet (Bahrain)", 14, 18);
    doc.setFontSize(10);
    doc.text(`Generated Date/Time: ${new Date().toLocaleString()}`, 14, 25);
    
    const rows = allData.map(d => [
        d.time, d.item, d.desc, 
        `BD ${d.price.toFixed(3)}`, 
        `BD ${d.paid.toFixed(3)}`, 
        `BD ${d.balance.toFixed(3)}`
    ]);

    let totalP = allData.reduce((acc, obj) => acc + obj.price, 0);
    let totalPaid = allData.reduce((acc, obj) => acc + obj.paid, 0);
    let totalBal = allData.reduce((acc, obj) => acc + obj.balance, 0);

    rows.push(['TOTALS', '', '', `BD ${totalP.toFixed(3)}`, `BD ${totalPaid.toFixed(3)}`, `BD ${totalBal.toFixed(3)}`]);
    
    doc.autoTable({
        head: [['Time & Date', 'Item Name', 'Description', 'Price', 'Paid', 'Balance']],
        body: rows,
        startY: 32,
        theme: 'grid',
        headStyles: { fillColor: [30, 60, 114] }
    });
    
    doc.save(`Khata_Report_BHD_${new Date().toISOString().slice(0,10)}.pdf`);
});
