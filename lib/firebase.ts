
declare const firebase: any;

const firebaseConfig = {
  apiKey: "AIzaSyBfnvmjYxeRCTeXDN8tz6qF2s6g01zBnvA",
  authDomain: "mtfwgen.firebaseapp.com",
  databaseURL: "https://mtfwgen-default-rtdb.firebaseio.com",
  projectId: "mtfwgen",
  storageBucket: "mtfwgen.firebasestorage.app",
  messagingSenderId: "221556010842",
  appId: "1:221556010842:web:e10994332e8d5e6ed6cd63",
  measurementId: "G-F07J9Q3B8E"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

export const app = firebase.app();
// Get a reference to the database service
export const db = firebase.database();
export const auth = firebase.auth();
export const storage = firebase.storage();

// Assign the global firebase object to a module-scoped constant to allow it to be exported.
const firebaseInstance = firebase;
export { firebaseInstance as firebase };