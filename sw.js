self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    return self.clients.claim();
});

// Yeh listener background mein push notification receive karega
self.addEventListener('push', (event) => {
    let data = { title: 'Cold Store Khata', body: 'New entry added to ledger!' };
    
    if (event.data) {
        data = event.data.json();
    }

    const options = {
        body: data.body,
        icon: 'https://cdn-icons-png.flaticon.com/512/2921/2921222.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/2921/2921222.png',
        vibrate: [200, 100, 200]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});
