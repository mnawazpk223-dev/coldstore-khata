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

// Initialize Firebase Database
firebase.initializeApp(firebaseConfig);
const db = firebase.database().ref('khata_entries');

// Live Clock in Header
setInterval(() => {
    const clockElem = document.getElementById('clock');
    if(clockElem) clockElem.innerText = new Date().toLocaleString();
}, 1000);

// Request Push Notification Permission
if ("Notification" in window) {
    Notification.requestPermission();
}

// --- SAVE ENTRY TO FIREBASE ---
document.getElementById('khataForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const item = document.getElementById('itemName').value;
    const desc = document.getElementById('desc').value;
    const price = parseFloat(document.getElementById('price').value);
    const paid = parseFloat(document.getElementById('paid').value);
    const balance = price - paid;
    const time = new Date().toLocaleString(); // Automatically logged date & time

    // Push entry to cloud (Firebase)
    db.push({ item, desc, price, paid, balance, time });

    // Reset Form Input Fields
    document.getElementById('khataForm').reset();
});

// --- REALTIME SYNC (AUTOMATIC UPDATE ON ALL PHONES) ---
let allData = [];

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
                    <td><button onclick="deleteEntry('${id}')" style="background:red; color:white; border:none; padding:4px 8px; border-radius:3px; cursor:pointer;">X</button></td>
                </tr>
            `;
        }
    }

    // Update Totals Summary
    document.getElementById('totalPrice').innerText = `$${tPrice.toFixed(2)}`;
    document.getElementById('totalPaid').innerText = `$${tPaid.toFixed(2)}`;
    document.getElementById('totalBalance').innerText = `$${tBal.toFixed(2)}`;
});

// Send Mobile Notification on New Entry
db.limitToLast(1).on('child_added', (snapshot) => {
    const val = snapshot.val();
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification("❄️ Cold Store Khata Updated", {
            body: `New Entry: ${val.item} - Price: $${val.price}`,
            icon: "https://cdn-icons-png.flaticon.com/512/3144/3144456.png"
        });
    }
});

// Delete Entry Function
function deleteEntry(id) {
    if (confirm("Kya aap is entry ko delete karna chahte hain?")) {
        firebase.database().ref('khata_entries/' + id).remove();
    }
}

// --- GENERATE & DOWNLOAD PDF BALANCE SHEET ---
function downloadPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Header
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

    // Calculate Totals for PDF
    let totalP = allData.reduce((acc, obj) => acc + obj.price, 0);
    let totalPaid = allData.reduce((acc, obj) => acc + obj.paid, 0);
    let totalBal = allData.reduce((acc, obj) => acc + obj.balance, 0);

    // Summary Row at the end
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