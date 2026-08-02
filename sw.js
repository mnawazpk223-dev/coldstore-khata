self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    return self.clients.claim();
});

// Background push notification listener
self.addEventListener('push', (e) => {
    let data = { title: 'Cold Store Khata', body: 'New update in Khata ledger!' };
    if (e.data) {
        data = e.data.json();
    }
    
    const options = {
        body: data.body,
        icon: 'https://cdn-icons-png.flaticon.com/512/2921/2921222.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/2921/2921222.png'
    };

    e.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});
