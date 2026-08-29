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

  _cachedDB: null,
  _openPromise: null,

  /**
   * Checks if an error is a QuotaExceededError / Storage Full error.
   * @param {Error|DOMException} err
   * @returns {boolean}
   */
  isQuotaExceeded(err) {
    if (!err) return false;
    const name = err.name || '';
    const msg = err.message || '';
    const code = err.code;
    return (
      name === 'QuotaExceededError' ||
      name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      code === 22 ||
      code === 1014 ||
      msg.includes('quota') ||
      msg.includes('storage full') ||
      msg.includes('exceeded')
    );
  },

  /**
   * Open or initialize the IndexedDB database with schema versioning and index creation.
   * Caches database instance and cleanly recovers on close/versionchange.
   * @returns {Promise<IDBDatabase>}
   */
  open() {
    if (this._cachedDB) {
      try {
        if (this._cachedDB.objectStoreNames) {
          return Promise.resolve(this._cachedDB);
        }
      } catch (e) {
        this._cachedDB = null;
      }
    }

    if (this._openPromise) {
      return this._openPromise;
    }

    this._openPromise = new Promise((resolve, reject) => {
      const idb = typeof indexedDB !== 'undefined'
        ? indexedDB
        : (typeof self !== 'undefined' ? self.indexedDB : null);

      if (!idb) {
        this._openPromise = null;
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

      request.onsuccess = () => {
        this._cachedDB = request.result;
        this._openPromise = null;

        // Handle external version change or close cleanly
        this._cachedDB.onversionchange = () => {
          try {
            this._cachedDB?.close();
          } catch (e) {}
          this._cachedDB = null;
        };

        this._cachedDB.onclose = () => {
          this._cachedDB = null;
        };

        resolve(this._cachedDB);
      };

      request.onerror = () => {
        this._openPromise = null;
        this._cachedDB = null;
        reject(request.error || new Error('IndexedDB açılamadı.'));
      };

      request.onblocked = () => {
        console.warn('[FullShotDB] Veritabanı açılışı başka bir sekme tarafından bloke edildi.');
      };
    });

    return this._openPromise;
  },

  /**
   * Saves a unified recording entry to IndexedDB with automatic QuotaExceededError recovery.
   * @param {Object} item { id, blob, dataUrl, mimeType, size, duration, timestamp, title, url, metadata }
   * @param {boolean} [retryOnQuota=true] Whether to attempt eviction on quota error
   * @returns {Promise<string>} Recording ID
   */
  async saveRecording(item, retryOnQuota = true) {
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
      try {
        const tx = db.transaction([this.STORES.RECORDINGS, this.STORES.VIDEOS], 'readwrite');
        const recStore = tx.objectStore(this.STORES.RECORDINGS);
        const vidStore = tx.objectStore(this.STORES.VIDEOS);

        recStore.put(record);
        vidStore.put(record); // mirror for backwards compatibility

        tx.oncomplete = () => resolve(recordId);

        tx.onerror = async () => {
          const err = tx.error || new Error('Kayıt IndexedDB\'ye yazılamadı.');
          if (retryOnQuota && this.isQuotaExceeded(err)) {
            console.warn('[FullShotDB] Depolama kotası aşıldı! Eski yakalama ve kayıtlar temizleniyor...');
            try {
              await this.cleanupOldEntries({ maxAgeMs: 12 * 60 * 60 * 1000, maxItems: 5 });
              const retryId = await this.saveRecording(item, false);
              resolve(retryId);
              return;
            } catch (cleanupErr) {
              console.error('[FullShotDB] Kota temizliği sonrası kayıt başarısız:', cleanupErr);
            }
          }
          reject(err);
        };

        tx.onabort = () => {
          reject(tx.error || new Error('Kayıt yazma işlemi iptal edildi.'));
        };
      } catch (err) {
        reject(err);
      }
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
      try {
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
      } catch (err) {
        reject(err);
      }
    });
  },

  /**
   * Retrieves all recordings from IndexedDB sorted by timestamp descending.
   * @returns {Promise<Array<Object>>}
   */
  async getAllRecordings() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(this.STORES.RECORDINGS, 'readonly');
        const store = tx.objectStore(this.STORES.RECORDINGS);
        const req = store.getAll();

        req.onsuccess = () => {
          const results = req.result || [];
          results.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          resolve(results);
        };
        req.onerror = () => reject(req.error || new Error('Kayıtlar listelenemedi.'));
      } catch (err) {
        reject(err);
      }
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
      try {
        const tx = db.transaction([this.STORES.RECORDINGS, this.STORES.VIDEOS], 'readwrite');
        tx.objectStore(this.STORES.RECORDINGS).delete(id);
        tx.objectStore(this.STORES.VIDEOS).delete(id);

        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error || new Error('Kayıt silinemedi.'));
      } catch (err) {
        reject(err);
      }
    });
  },

  /**
   * Clears all recording entries from IndexedDB.
   * @returns {Promise<boolean>}
   */
  async clearAllRecordings() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction([this.STORES.RECORDINGS, this.STORES.VIDEOS], 'readwrite');
        tx.objectStore(this.STORES.RECORDINGS).clear();
        tx.objectStore(this.STORES.VIDEOS).clear();

        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error || new Error('Kayıtlar temizlenemedi.'));
      } catch (err) {
        reject(err);
      }
    });
  },

  /**
   * Saves a screenshot/capture entry to IndexedDB with QuotaExceededError protection and retry.
   * @param {string|Object} id Capture ID or capture item object
   * @param {Blob|string} [data] Base64 dataUrl or Image Blob
   * @param {Object} [metadata={}] Title, URL, dimensions, format, etc.
   * @param {boolean} [retryOnQuota=true] Whether to attempt eviction on quota error
   * @returns {Promise<string>} Capture ID
   */
  async saveCapture(id, data, metadata = {}, retryOnQuota = true) {
    let targetId = id;
    let targetData = data;
    let targetMeta = metadata;

    if (typeof id === 'object' && id !== null && !data) {
      const item = id;
      targetId = item.id || `cap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      targetData = item.dataUrl || item.data || item.blob;
      targetMeta = item;
    }

    if (!targetData) throw new Error('Kaydedilecek ekran görüntüsü verisi bulunamadı.');
    const db = await this.open();
    const recordId = targetId || `cap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const isBlob = (typeof Blob !== 'undefined' && targetData instanceof Blob);
    const record = {
      id: recordId,
      data: targetData,
      dataUrl: typeof targetData === 'string' ? targetData : null,
      blob: isBlob ? targetData : null,
      title: targetMeta.title || 'Ekran Görüntüsü',
      url: targetMeta.url || '',
      type: targetMeta.type || 'screenshot',
      format: targetMeta.format || 'png',
      width: targetMeta.width || 0,
      height: targetMeta.height || 0,
      timestamp: targetMeta.timestamp || Date.now(),
      metadata: targetMeta
    };

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(this.STORES.CAPTURES, 'readwrite');
        const store = tx.objectStore(this.STORES.CAPTURES);
        store.put(record);

        tx.oncomplete = () => resolve(recordId);

        tx.onerror = async () => {
          const err = tx.error || new Error('Ekran görüntüsü kaydedilemedi.');
          if (retryOnQuota && this.isQuotaExceeded(err)) {
            console.warn('[FullShotDB] Capture kaydı sırasında depolama kotası aşıldı! Eski yakalamalar temizleniyor...');
            try {
              await this.cleanupOldEntries({ maxAgeMs: 6 * 60 * 60 * 1000, maxItems: 8 });
              const retryId = await this.saveCapture(id, data, metadata, false);
              resolve(retryId);
              return;
            } catch (cleanupErr) {
              console.error('[FullShotDB] Kota temizliği sonrası capture kaydı başarısız:', cleanupErr);
            }
          }
          reject(err);
        };

        tx.onabort = () => {
          reject(tx.error || new Error('Ekran görüntüsü işlemi iptal edildi.'));
        };
      } catch (err) {
        reject(err);
      }
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
      try {
        const tx = db.transaction(this.STORES.CAPTURES, 'readonly');
        const store = tx.objectStore(this.STORES.CAPTURES);
        const req = store.get(id);

        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error || new Error('Ekran görüntüsü okunamadı.'));
      } catch (err) {
        reject(err);
      }
    });
  },

  /**
   * Retrieves all captures from IndexedDB sorted by timestamp descending.
   * @returns {Promise<Array<Object>>}
   */
  async getAllCaptures() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(this.STORES.CAPTURES, 'readonly');
        const store = tx.objectStore(this.STORES.CAPTURES);
        const req = store.getAll();

        req.onsuccess = () => {
          const results = req.result || [];
          results.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          resolve(results);
        };
        req.onerror = () => reject(req.error || new Error('Ekran görüntüleri listelenemedi.'));
      } catch (err) {
        reject(err);
      }
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
      try {
        const tx = db.transaction(this.STORES.CAPTURES, 'readwrite');
        const store = tx.objectStore(this.STORES.CAPTURES);
        store.delete(id);

        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error || new Error('Ekran görüntüsü silinemedi.'));
      } catch (err) {
        reject(err);
      }
    });
  },

  /**
   * Clears all capture entries from IndexedDB.
   * @returns {Promise<boolean>}
   */
  async clearAllCaptures() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(this.STORES.CAPTURES, 'readwrite');
        const store = tx.objectStore(this.STORES.CAPTURES);
        store.clear();

        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error || new Error('Ekran görüntüleri temizlenemedi.'));
      } catch (err) {
        reject(err);
      }
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
   * Safely prunes old entries from captures and recordings to prevent QuotaExceededError.
   * Preserves 'current_capture' and 'current_video'.
   * @param {Object} options { maxAgeMs: number, maxItems: number, storeName: string }
   * @returns {Promise<number>} Number of deleted items
   */
  async cleanupOldEntries({ maxAgeMs = 24 * 60 * 60 * 1000, maxItems = 10, storeName = null } = {}) {
    let deletedCount = 0;
    const now = Date.now();
    const cutoff = now - maxAgeMs;

    const pruneStore = async (targetStore) => {
      const db = await this.open();
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(targetStore, 'readwrite');
          const store = tx.objectStore(targetStore);
          const req = store.getAll();

          req.onsuccess = () => {
            const items = req.result || [];
            items.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

            let toDelete = [];
            items.forEach((item) => {
              if (item.id === 'current_capture' || item.id === 'current_video') return;
              if ((item.timestamp || 0) < cutoff) {
                toDelete.push(item.id);
              }
            });

            if (items.length - toDelete.length > maxItems) {
              const surplus = (items.length - toDelete.length) - maxItems;
              const remaining = items.filter((i) => !toDelete.includes(i.id) && i.id !== 'current_capture' && i.id !== 'current_video');
              for (let i = 0; i < Math.min(surplus, remaining.length); i++) {
                toDelete.push(remaining[i].id);
              }
            }

            toDelete.forEach((id) => store.delete(id));
            deletedCount += toDelete.length;
            tx.oncomplete = () => resolve(toDelete.length);
            tx.onerror = () => resolve(0);
          };
          req.onerror = () => resolve(0);
        } catch (e) {
          resolve(0);
        }
      });
    };

    if (!storeName || storeName === this.STORES.CAPTURES) {
      await pruneStore(this.STORES.CAPTURES);
    }
    if (!storeName || storeName === this.STORES.RECORDINGS) {
      await pruneStore(this.STORES.RECORDINGS);
    }

    return deletedCount;
  },

  /**
   * Estimates total storage usage in bytes.
   * @returns {Promise<{ usage: number, quota: number }>}
   */
  async getStorageUsage() {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          usage: estimate.usage || 0,
          quota: estimate.quota || 0
        };
      } catch (e) {
        // Fallback
      }
    }
    return { usage: 0, quota: 0 };
  },

  /**
   * Returns detailed quota diagnostic information.
   * @returns {Promise<{ usage: number, quota: number, percentUsed: number, isNearQuota: boolean, remainingBytes: number }>}
   */
  async getStorageQuotaInfo() {
    const { usage, quota } = await this.getStorageUsage();
    const percentUsed = quota > 0 ? (usage / quota) * 100 : 0;
    const remainingBytes = Math.max(0, quota - usage);
    const isNearQuota = percentUsed > 85 || (quota > 0 && remainingBytes < 50 * 1024 * 1024);

    return {
      usage,
      quota,
      percentUsed: Math.round(percentUsed * 10) / 10,
      isNearQuota,
      remainingBytes
    };
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
