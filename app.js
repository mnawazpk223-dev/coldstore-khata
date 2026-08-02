// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyDizPXfz3urzxBJOJ2rEC9LBtLhNK3J6-w",
    authDomain: "coldstorekhata.firebaseapp.com",
    databaseURL: "https://coldstorekhata-default-rtdb.firebaseio.com",
    projectId: "coldstorekhata",
    storageBucket: "coldstorekhata.firebasestorage.app",
    messagingSenderId: "502742556617",
    appId: "1:502742556617:web:f46accc9816dc185fa5218",
    measurementId: "G-X3G1EEZ4N8"
};

// Initialize Firebase safely
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.database().ref('khata_entries');

let isSignUp = false;
let lastDeletedEntry = null;
let undoTimeout = null;
let allData = [];

// --- LOGIN / SIGN UP TOGGLE ---
const switchAuth = document.getElementById('switchAuth');
switchAuth.addEventListener('click', (e) => {
    e.preventDefault();
    isSignUp = !isSignUp;
    document.getElementById('authTitle').innerText = isSignUp ? "Sign Up for Khata" : "Login to Khata";
    document.getElementById('authBtn').innerText = isSignUp ? "Create Account" : "Sign In";
    switchAuth.innerText = isSignUp ? "Login" : "Sign Up";
    document.getElementById('toggleAuth').firstChild.textContent = isSignUp ? "Already have an account? " : "Don't have an account? ";
});

// --- AUTH SUBMIT HANDLER ---
document.getElementById('authForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('authEmail').value;
    const pass = document.getElementById('authPassword').value;

    if (isSignUp) {
        auth.createUserWithEmailAndPassword(email, pass)
            .then(() => alert("Account created successfully! You are now logged in."))
            .catch(err => alert(err.message));
    } else {
        auth.signInWithEmailAndPassword(email, pass)
            .catch(err => alert(err.message));
    }
});

auth.onAuthStateChanged((user) => {
    if (user) {
        document.getElementById('authContainer').style.display = 'none';
        document.getElementById('appContainer').style.display = 'block';
        loadData();
    } else {
        document.getElementById('authContainer').style.display = 'block';
        document.getElementById('appContainer').style.display = 'none';
    }
});

function logout() {
    auth.signOut();
}

// --- CLOCK ---
setInterval(() => {
    const clock = document.getElementById('clock');
    if (clock) clock.innerText = new Date().toLocaleString();
}, 1000);

// --- ADD / EDIT ENTRY ---
document.getElementById('khataForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const editId = document.getElementById('editId').value;
    const item = document.getElementById('itemName').value;
    const desc = document.getElementById('desc').value;
    const price = parseFloat(document.getElementById('price').value);
    const paid = parseFloat(document.getElementById('paid').value);
    const balance = price - paid;
    const time = new Date().toLocaleString();

    if (editId) {
        db.child(editId).update({ item, desc, price, paid, balance });
    } else {
        db.push({ item, desc, price, paid, balance, time });
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

// --- EDIT ENTRY FUNCTION ---
function editEntry(id) {
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
}

// --- DELETE & UNDO SYSTEM ---
function deleteEntry(id) {
    const itemData = allData.find(d => d.id === id);
    if (itemData && confirm("Are you sure you want to delete this entry?")) {
        lastDeletedEntry = itemData;
        db.child(id).remove();

        const toast = document.getElementById('undoToast');
        toast.style.display = 'flex';
        
        clearTimeout(undoTimeout);
        undoTimeout = setTimeout(() => {
            toast.style.display = 'none';
            lastDeletedEntry = null;
        }, 7000);
    }
}

function undoDelete() {
    if (lastDeletedEntry) {
        const id = lastDeletedEntry.id;
        delete lastDeletedEntry.id;
        db.child(id).set(lastDeletedEntry);
        lastDeletedEntry = null;
        document.getElementById('undoToast').style.display = 'none';
    }
}

// --- RESET ALL DATA SYSTEM ---
function resetAllData() {
    if (confirm("⚠️ WARNING: Do you want to clear the entire Khata? This cannot be undone!")) {
        if (confirm("FINAL CONFIRMATION: Delete all entries permanently?")) {
            db.remove();
        }
    }
}

// --- REALTIME DATABASE SYNC ---
function loadData() {
    db.on('value', (snapshot) => {
        const tableBody = document.getElementById('tableBody');
        tableBody.innerHTML = '';
        
        let tPrice = 0, tPaid = 0, tBal = 0;
        allData = [];

        const data = snapshot.val();
        
        if (data) {
            for (let id in data) {
                const row = data[id];
                row.id = id;
                allData.push(row);

                tPrice += row.price;
                tPaid += row.paid;
                tBal += row.balance;

                tableBody.innerHTML += `
                    <tr>
                        <td><small>${row.time}</small></td>
                        <td><b>${row.item}</b></td>
                        <td>${row.desc}</td>
                        <td>$${row.price.toFixed(2)}</td>
                        <td style="color:green; font-weight:bold;">$${row.paid.toFixed(2)}</td>
                        <td style="color:red; font-weight:bold;">$${row.balance.toFixed(2)}</td>
                        <td>
                            <button class="edit-btn" onclick="editEntry('${id}')">✏️</button>
                            <button class="del-btn" onclick="deleteEntry('${id}')">X</button>
                        </td>
                    </tr>
                `;
            }
        }

        document.getElementById('totalPrice').innerText = `$${tPrice.toFixed(2)}`;
        document.getElementById('totalPaid').innerText = `$${tPaid.toFixed(2)}`;
        document.getElementById('totalBalance').innerText = `$${tBal.toFixed(2)}`;
    });
}

// --- PDF DOWNLOAD ---
function downloadPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Cold Store Daily Khata Balance Sheet", 14, 18);
    doc.setFontSize(10);
    doc.text(`Generated Date/Time: ${new Date().toLocaleString()}`, 14, 25);
    
    const rows = allData.map(d => [
        d.time, 
        d.item, 
        d.desc, 
        `$${d.price.toFixed(2)}`, 
        `$${d.paid.toFixed(2)}`, 
        `$${d.balance.toFixed(2)}`
    ]);

    let totalP = allData.reduce((acc, obj) => acc + obj.price, 0);
    let totalPaid = allData.reduce((acc, obj) => acc + obj.paid, 0);
    let totalBal = allData.reduce((acc, obj) => acc + obj.balance, 0);

    rows.push(['TOTALS', '', '', `$${totalP.toFixed(2)}`, `$${totalPaid.toFixed(2)}`, `$${totalBal.toFixed(2)}`]);
    
    doc.autoTable({
        head: [['Time & Date', 'Item Name', 'Description', 'Price', 'Paid', 'Balance']],
        body: rows,
        startY: 32,
        theme: 'grid',
        headStyles: { fillColor: [30, 60, 114] }
    });
    
    doc.save(`Khata_Report_${new Date().toISOString().slice(0,10)}.pdf`);
}
