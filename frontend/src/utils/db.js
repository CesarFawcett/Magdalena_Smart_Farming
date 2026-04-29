/**
 * IndexedDB Wrapper for Magdalena Smart Farming
 * Offline-first support
 */

const DB_NAME = 'MagdalenaDB';
const DB_VERSION = 1;
const STORE_NAME = 'user_session';

export const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject('IndexedDB error: ' + event.target.errorCode);
    };
  });
};

export const saveSession = async (userData) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({ id: 'current_user', ...userData, lastLogin: new Date().toISOString() });

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(false);
  });
};

export const getSession = async () => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get('current_user');

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(null);
  });
};

export const clearSession = async () => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete('current_user');

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(false);
  });
};
