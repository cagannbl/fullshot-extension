/**
 * FullShot Pro - IndexedDB Storage Engine for Media (Recordings & Captures)
 * Version 2: Unified FullShotMediaDB supporting large binary video Blobs,
 * screenshot captures, metadata indexing, fast retrieval, and cross-context persistence.
 * 
 * Usable in Background Service Worker, Offscreen Document, Popup, and Studio pages.
 */

const FullShotDB = {
  DB_NAME: 'FullShotMediaDB',
  DB_VERSION: 2,
  STORES: {
    RECORDINGS: 'recordings',
    VIDEOS: 'videos',
    CAPTURES: 'captures'
  },

  /**
   * Open or initialize the IndexedDB database with schema versioning and index creation.
   * @returns {Promise<IDBDatabase>}
   */
  open() {
    return new Promise((resolve, reject) => {
      const idb = typeof indexedDB !== 'undefined'
        ? indexedDB
        : (typeof self !== 'undefined' ? self.indexedDB : null);

      if (!idb) {
        reject(new Error('IndexedDB bu ortamda desteklenmiyor.'));
        return;
      }

      const request = idb.open(this.DB_NAME, this.DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;

        // 1. Unified recordings store (Primary video & screen recording store)
        if (!db.objectStoreNames.contains(this.STORES.RECORDINGS)) {
          const recordingStore = db.createObjectStore(this.STORES.RECORDINGS, { keyPath: 'id' });
          recordingStore.createIndex('timestamp', 'timestamp', { unique: false });
          recordingStore.createIndex('title', 'title', { unique: false });
          recordingStore.createIndex('mimeType', 'mimeType', { unique: false });
        } else {
          const recordingStore = request.transaction.objectStore(this.STORES.RECORDINGS);
          if (!recordingStore.indexNames.contains('timestamp')) {
            recordingStore.createIndex('timestamp', 'timestamp', { unique: false });
          }
          if (!recordingStore.indexNames.contains('title')) {
            recordingStore.createIndex('title', 'title', { unique: false });
          }
        }

        // 2. Legacy / Video alias store (Backwards compatibility)
        if (!db.objectStoreNames.contains(this.STORES.VIDEOS)) {
          const videoStore = db.createObjectStore(this.STORES.VIDEOS, { keyPath: 'id' });
          videoStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // 3. Captures store (High-resolution screenshots, full-page slices & canvases)
        if (!db.objectStoreNames.contains(this.STORES.CAPTURES)) {
          const captureStore = db.createObjectStore(this.STORES.CAPTURES, { keyPath: 'id' });
          captureStore.createIndex('timestamp', 'timestamp', { unique: false });
          captureStore.createIndex('type', 'type', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('IndexedDB açılamadı.'));
      request.onblocked = () => console.warn('[FullShotDB] Veritabanı açılışı başka bir sekme tarafından bloke edildi.');
    });
  },

  /**
   * Saves a unified recording entry to IndexedDB.
   * @param {Object} item { id, blob, dataUrl, mimeType, size, duration, timestamp, title, url, metadata }
   * @returns {Promise<string>} Recording ID
   */
  async saveRecording(item) {
    if (!item) throw new Error('Kaydedilecek video verisi bulunamadı.');
    const db = await this.open();

    const recordId = item.id || `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record = {
      id: recordId,
      blob: item.blob || null,
      dataUrl: item.dataUrl || null,
      mimeType: item.mimeType || item.blob?.type || 'video/webm',
      size: typeof item.size === 'number' ? item.size : (item.blob?.size || 0),
      duration: typeof item.duration === 'number' ? item.duration : 0,
      timestamp: item.timestamp || Date.now(),
      title: item.title || 'Ekran Kaydı',
      url: item.url || '',
      metadata: item.metadata || {}
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction([this.STORES.RECORDINGS, this.STORES.VIDEOS], 'readwrite');
      const recStore = tx.objectStore(this.STORES.RECORDINGS);
      const vidStore = tx.objectStore(this.STORES.VIDEOS);

      recStore.put(record);
      vidStore.put(record); // mirror for backwards compatibility

      tx.oncomplete = () => resolve(recordId);
      tx.onerror = () => reject(tx.error || new Error('Kayıt IndexedDB\'ye yazılamadı.'));
      tx.onabort = () => reject(tx.error || new Error('Kayıt yazma işlemi iptal edildi.'));
    });
  },

  /**
   * Retrieves a recording by ID from IndexedDB.
   * @param {string} id Recording ID (default: 'current_video')
   * @returns {Promise<Object|null>}
   */
  async getRecording(id = 'current_video') {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([this.STORES.RECORDINGS, this.STORES.VIDEOS], 'readonly');
      const recStore = tx.objectStore(this.STORES.RECORDINGS);
      const req = recStore.get(id);

      req.onsuccess = () => {
        if (req.result) {
          resolve(req.result);
          return;
        }
        // Fallback check in legacy videos store
        const vidStore = tx.objectStore(this.STORES.VIDEOS);
        const vidReq = vidStore.get(id);
        vidReq.onsuccess = () => resolve(vidReq.result || null);
        vidReq.onerror = () => resolve(null);
      };

      req.onerror = () => reject(req.error || new Error('Kayıt IndexedDB\'den okunamadı.'));
    });
  },

  /**
   * Retrieves all recordings from IndexedDB sorted by timestamp descending.
   * @returns {Promise<Array<Object>>}
   */
  async getAllRecordings() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORES.RECORDINGS, 'readonly');
      const store = tx.objectStore(this.STORES.RECORDINGS);
      const req = store.getAll();

      req.onsuccess = () => {
        const results = req.result || [];
        results.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        resolve(results);
      };
      req.onerror = () => reject(req.error || new Error('Kayıtlar listelenemedi.'));
    });
  },

  /**
   * Deletes a recording by ID from IndexedDB.
   * @param {string} id Recording ID
   * @returns {Promise<boolean>}
   */
  async deleteRecording(id = 'current_video') {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([this.STORES.RECORDINGS, this.STORES.VIDEOS], 'readwrite');
      tx.objectStore(this.STORES.RECORDINGS).delete(id);
      tx.objectStore(this.STORES.VIDEOS).delete(id);

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error || new Error('Kayıt silinemedi.'));
    });
  },

  /**
   * Clears all recording entries from IndexedDB.
   * @returns {Promise<boolean>}
   */
  async clearAllRecordings() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([this.STORES.RECORDINGS, this.STORES.VIDEOS], 'readwrite');
      tx.objectStore(this.STORES.RECORDINGS).clear();
      tx.objectStore(this.STORES.VIDEOS).clear();

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error || new Error('Kayıtlar temizlenemedi.'));
    });
  },

  /**
   * Saves a screenshot/capture entry to IndexedDB.
   * @param {string} id Capture ID
   * @param {Blob|string} data Base64 dataUrl or Image Blob
   * @param {Object} metadata Title, URL, dimensions, format, etc.
   * @returns {Promise<string>} Capture ID
   */
  async saveCapture(id, data, metadata = {}) {
    if (!data) throw new Error('Kaydedilecek ekran görüntüsü verisi bulunamadı.');
    const db = await this.open();
    const recordId = id || `cap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record = {
      id: recordId,
      data: data,
      dataUrl: typeof data === 'string' ? data : null,
      blob: data instanceof Blob ? data : null,
      title: metadata.title || 'Ekran Görüntüsü',
      url: metadata.url || '',
      type: metadata.type || 'screenshot',
      format: metadata.format || 'png',
      width: metadata.width || 0,
      height: metadata.height || 0,
      timestamp: metadata.timestamp || Date.now(),
      metadata: metadata
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORES.CAPTURES, 'readwrite');
      const store = tx.objectStore(this.STORES.CAPTURES);
      const req = store.put(record);

      req.onsuccess = () => resolve(recordId);
      req.onerror = () => reject(req.error || new Error('Ekran görüntüsü kaydedilemedi.'));
    });
  },

  /**
   * Retrieves a capture by ID from IndexedDB.
   * @param {string} id Capture ID
   * @returns {Promise<Object|null>}
   */
  async getCapture(id = 'current_capture') {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORES.CAPTURES, 'readonly');
      const store = tx.objectStore(this.STORES.CAPTURES);
      const req = store.get(id);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error || new Error('Ekran görüntüsü okunamadı.'));
    });
  },

  /**
   * Retrieves all captures from IndexedDB sorted by timestamp descending.
   * @returns {Promise<Array<Object>>}
   */
  async getAllCaptures() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORES.CAPTURES, 'readonly');
      const store = tx.objectStore(this.STORES.CAPTURES);
      const req = store.getAll();

      req.onsuccess = () => {
        const results = req.result || [];
        results.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        resolve(results);
      };
      req.onerror = () => reject(req.error || new Error('Ekran görüntüleri listelenemedi.'));
    });
  },

  /**
   * Deletes a capture by ID from IndexedDB.
   * @param {string} id Capture ID
   * @returns {Promise<boolean>}
   */
  async deleteCapture(id = 'current_capture') {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORES.CAPTURES, 'readwrite');
      const store = tx.objectStore(this.STORES.CAPTURES);
      store.delete(id);

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error || new Error('Ekran görüntüsü silinemedi.'));
    });
  },

  /**
   * Clears all capture entries from IndexedDB.
   * @returns {Promise<boolean>}
   */
  async clearAllCaptures() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORES.CAPTURES, 'readwrite');
      const store = tx.objectStore(this.STORES.CAPTURES);
      store.clear();

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error || new Error('Ekran görüntüleri temizlenemedi.'));
    });
  },

  /**
   * Clears all stores in FullShotMediaDB.
   * @returns {Promise<boolean>}
   */
  async clearAll() {
    await this.clearAllRecordings();
    await this.clearAllCaptures();
    return true;
  },

  /**
   * Estimates total storage usage in bytes.
   * @returns {Promise<{ usage: number, quota: number }>}
   */
  async getStorageUsage() {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      return await navigator.storage.estimate();
    }
    return { usage: 0, quota: 0 };
  },

  // ==========================================
  // Legacy Aliases
  // ==========================================
  async saveVideo(id, blob, metadata = {}) {
    return await this.saveRecording({
      id: id || 'current_video',
      blob,
      size: blob?.size || 0,
      mimeType: blob?.type || 'video/webm',
      duration: metadata.duration || 0,
      title: metadata.title || 'Ekran Kaydı',
      url: metadata.url || '',
      metadata
    });
  },

  async getVideo(id = 'current_video') {
    return await this.getRecording(id);
  },

  async deleteVideo(id = 'current_video') {
    return await this.deleteRecording(id);
  },

  async getAllVideos() {
    return await this.getAllRecordings();
  }
};

// ==========================================
// Cross-Context Exports
// ==========================================
if (typeof window !== 'undefined') {
  window.FullShotDB = FullShotDB;
}
if (typeof self !== 'undefined') {
  self.FullShotDB = FullShotDB;
}
if (typeof globalThis !== 'undefined') {
  globalThis.FullShotDB = FullShotDB;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FullShotDB;
}
