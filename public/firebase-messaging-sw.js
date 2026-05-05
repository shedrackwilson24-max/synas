importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAYcZicytkLi6ImOk4UEvGqYu549HgyvTU",
  authDomain: "gen-lang-client-0123130028.firebaseapp.com",
  projectId: "gen-lang-client-0123130028",
  storageBucket: "gen-lang-client-0123130028.firebasestorage.app",
  messagingSenderId: "1074438860591",
  appId: "1:1074438860591:web:c13018a6c5a63486d13bda"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.ico'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
