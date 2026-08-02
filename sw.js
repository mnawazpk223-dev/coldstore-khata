importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyDizPXfz3urzxBJOJ2rEC9LBtLhNK3J6-w",
    projectId: "coldstorekhata",
    messagingSenderId: "502742556617",
    appId: "1:502742556617:web:f46accc9816dc185fa5218"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: 'https://cdn-icons-png.flaticon.com/512/2921/2921222.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/2921/2921222.png'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
