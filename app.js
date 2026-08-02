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

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// FIX: Explicitly pass the database URL here
const db = firebase.database('https://coldstorekhata-default-rtdb.firebaseio.com').ref('khata_entries');
