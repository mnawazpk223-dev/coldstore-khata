// --- LOAD DATA & LIVE NOTIFICATIONS ACROSS ALL DEVICES ---
let isInitialLoad = true; // Taaki purana data load hote waqt purani entries ki notification na aaye

function loadData() {
    onValue(dbRef, (snapshot) => {
        const tableBody = document.getElementById('tableBody');
        tableBody.innerHTML = '';
        let tPrice = 0, tPaid = 0, tBal = 0;
        let latestEntry = null;
        allData = [];

        const data = snapshot.val();
        if (data) {
            const keys = Object.keys(data);
            const lastKey = keys[keys.length - 1]; // Sab se aakhri (new) entry

            for (let id in data) {
                const row = data[id];
                row.id = id;
                allData.push(row);

                tPrice += row.price;
                tPaid += row.paid;
                tBal += row.balance;

                // Agar yeh bilkul nayi entry hai aur pehli dafa page load nahi ho raha
                if (id === lastKey && !isInitialLoad) {
                    showDesktopNotification(`New Khata Entry Added!`, `Item: ${row.item} | Price: BD ${row.price.toFixed(3)}`);
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

        isInitialLoad = false; // Pehla load khatam, ab sirf real-time new entries par notification aayegi

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

// --- HELPER FUNCTION TO SHOW BROWSER NOTIFICATION ---
function showDesktopNotification(title, bodyText) {
    if (Notification.permission === 'granted') {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(title, {
                    body: bodyText,
                    icon: 'https://cdn-icons-png.flaticon.com/512/2921/2921222.png',
                    badge: 'https://cdn-icons-png.flaticon.com/512/2921/2921222.png'
                });
            });
        } else {
            new Notification(title, { body: bodyText });
        }
    }
}
