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

// --- SERVICE WORKER ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => console.log(err));
    });
}

// --- PWA INSTALL ---
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
            if (outcome === 'accepted' && installContainer) {
                installContainer.style.display = 'none';
            }
            deferredPrompt = null;
        } else {
            alert("App is already installed or check browser menu to 'Add to Home Screen'.");
        }
    });
}

// --- TOGGLE AUTH ---
const switchAuth = document.getElementById('switchAuth');
if(switchAuth) {
    switchAuth.addEventListener('click', (e) => {
        e.preventDefault();
        isSignUp = !isSignUp;
        const authTitle = document.getElementById('authTitle');
        const authBtn = document.getElementById('authBtn');
        const toggleAuth = document.getElementById('toggleAuth');
        
        if(authTitle) authTitle.innerText = isSignUp ? "Sign Up for Khata" : "Login to Khata";
        if(authBtn) authBtn.innerText = isSignUp ? "Create Account" : "Sign In";
        switchAuth.innerText = isSignUp ? "Login" : "Sign Up";
        if(toggleAuth) toggleAuth.firstChild.textContent = isSignUp ? "Already have an account? " : "Don't have an account? ";
    });
}

// --- AUTH SUBMIT ---
const authForm = document.getElementById('authForm');
if(authForm) {
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailEl = document.getElementById('authEmail');
        const passEl = document.getElementById('authPassword');
        
        if(!emailEl || !passEl) return;
        const email = emailEl.value.trim();
        const pass = passEl.value.trim();

        try {
            if (isSignUp) {
                await createUserWithEmailAndPassword(auth, email, pass);
                alert("Account created successfully!");
            } else {
                await signInWithEmailAndPassword(auth, email, pass);
            }
        } catch (err) {
            alert("Error: " + err.message);
        }
    });
}

onAuthStateChanged(auth, (user) => {
    const authContainer = document.getElementById('authContainer');
    const appContainer = document.getElementById('appContainer');
    
    if (user) {
        if(authContainer) authContainer.style.display = 'none';
        if(appContainer) appContainer.style.display = 'block';
        loadData();
    } else {
        if(authContainer) authContainer.style.display = 'block';
        if(appContainer) appContainer.style.display = 'none';
    }
});

const logoutBtn = document.getElementById('logoutBtn');
if(logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth);
    });
}

// --- CLOCK ---
setInterval(() => {
    const clock = document.getElementById('clock');
    if (clock) clock.innerText = new Date().toLocaleString();
}, 1000);

// --- ADD / EDIT ENTRY ---
const khataForm = document.getElementById('khataForm');
if(khataForm) {
    khataForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const editId = document.getElementById('editId').value;
        const item = document.getElementById('itemName').value;
        const desc = document.getElementById('desc').value;
        
        let priceInput = document.getElementById('price').value;
        let paidInput = document.getElementById('paid').value;

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
}

function resetForm() {
    const form = document.getElementById('khataForm');
    if(form) form.reset();
    const editId = document.getElementById('editId');
    if(editId) editId.value = '';
    const formTitle = document.getElementById('formTitle');
    if(formTitle) formTitle.innerText = 'Add New Entry';
    const saveBtn = document.getElementById('saveBtn');
    if(saveBtn) saveBtn.innerText = '➕ Save & Sync Entry';
    const cancelBtn = document.getElementById('cancelEditBtn');
    if(cancelBtn) cancelBtn.style.display = 'none';
}

const cancelEditBtn = document.getElementById('cancelEditBtn');
if(cancelEditBtn) {
    cancelEditBtn.addEventListener('click', resetForm);
}

// --- LOAD DATA ---
function loadData() {
    onValue(dbRef, (snapshot) => {
        const tableBody = document.getElementById('tableBody');
        if(!tableBody) return;
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

                if (id === lastKey && !isInitialLoad) {
                    showInAppNotification(`✨ New Entry: ${row.item} (BD ${row.price.toFixed(3)})`);
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

        const totalPriceEl = document.getElementById('totalPrice');
        const totalPaidEl = document.getElementById('totalPaid');
        const totalBalanceEl = document.getElementById('totalBalance');

        if(totalPriceEl) totalPriceEl.innerText = `BD ${tPrice.toFixed(3)}`;
        if(totalPaidEl) totalPaidEl.innerText = `BD ${tPaid.toFixed(3)}`;
        if(totalBalanceEl) totalBalanceEl.innerText = `BD ${tBal.toFixed(3)}`;

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
                    if(toast) {
                        toast.style.display = 'flex';
                        clearTimeout(undoTimeout);
                        undoTimeout = setTimeout(() => {
                            toast.style.display = 'none';
                            lastDeletedEntry = null;
                        }, 7000);
                    }
                }
            });
        });
    });
}

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
const undoBtn = document.getElementById('undoBtn');
if(undoBtn) {
    undoBtn.addEventListener('click', () => {
        if (lastDeletedEntry) {
            const id = lastDeletedEntry.id;
            delete lastDeletedEntry.id;
            set(ref(database, 'khata_entries/' + id), lastDeletedEntry);
            lastDeletedEntry = null;
            const toast = document.getElementById('undoToast');
            if(toast) toast.style.display = 'none';
        }
    });
}

// --- RESET ALL ---
const resetAllBtn = document.getElementById('resetAllBtn');
if(resetAllBtn) {
    resetAllBtn.addEventListener('click', () => {
        if (confirm("⚠️ WARNING: Clear entire Khata?")) {
            if (confirm("FINAL CONFIRMATION: Delete permanently?")) {
                remove(dbRef);
            }
        }
    });
}

// --- PDF DOWNLOAD ---
const pdfBtn = document.getElementById('pdfBtn');
if(pdfBtn) {
    pdfBtn.addEventListener('click', () => {
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
        let totalBal = allData.reduce((obj1, obj2) => obj1 + obj2.balance, 0);

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
}
