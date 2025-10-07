import firestore from '@react-native-firebase/firestore';
console.log('Firestore is loaded:', typeof firestore === 'function'); // should be true
export const dbPromise = Promise.resolve(firestore());