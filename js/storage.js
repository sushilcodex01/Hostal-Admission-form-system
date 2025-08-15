// Local Storage Handler for Draft Management
class StorageHandler {
    constructor() {
        this.storageKey = 'hostel_admission_draft';
        this.formHistoryKey = 'hostel_admission_history';
        this.settingsKey = 'hostel_admission_settings';
        this.maxHistoryItems = 10;
        this.compressionEnabled = true;
    }
    
    // Draft management
    saveDraft(formData) {
        try {
            const draftData = {
                formData: this.sanitizeData(formData),
                timestamp: new Date().toISOString(),
                version: this.getAppVersion()
            };
            
            const dataToStore = this.compressionEnabled ? 
                this.compressData(draftData) : draftData;
            
            localStorage.setItem(this.storageKey, JSON.stringify(dataToStore));
            
            console.log('Draft saved successfully');
            return true;
            
        } catch (error) {
            console.error('Failed to save draft:', error);
            this.handleStorageError(error);
            return false;
        }
    }
    
    loadDraft() {
        try {
            const storedData = localStorage.getItem(this.storageKey);
            
            if (!storedData) {
                return null;
            }
            
            let draftData = JSON.parse(storedData);
            
            // Decompress if needed
            if (this.compressionEnabled && draftData.compressed) {
                draftData = this.decompressData(draftData);
            }
            
            // Validate draft data
            if (!this.validateDraftData(draftData)) {
                console.warn('Invalid draft data found, clearing...');
                this.clearDraft();
                return null;
            }
            
            // Check if draft is too old
            if (this.isDraftExpired(draftData.timestamp)) {
                console.log('Draft expired, clearing...');
                this.clearDraft();
                return null;
            }
            
            console.log('Draft loaded successfully');
            return draftData.formData;
            
        } catch (error) {
            console.error('Failed to load draft:', error);
            this.clearDraft(); // Clear corrupted data
            return null;
        }
    }
    
    clearDraft() {
        try {
            localStorage.removeItem(this.storageKey);
            console.log('Draft cleared successfully');
            return true;
        } catch (error) {
            console.error('Failed to clear draft:', error);
            return false;
        }
    }
    
    hasDraft() {
        try {
            const storedData = localStorage.getItem(this.storageKey);
            return !!storedData;
        } catch (error) {
            console.error('Failed to check draft existence:', error);
            return false;
        }
    }
    
    getDraftInfo() {
        try {
            const storedData = localStorage.getItem(this.storageKey);
            
            if (!storedData) {
                return null;
            }
            
            let draftData = JSON.parse(storedData);
            
            if (this.compressionEnabled && draftData.compressed) {
                draftData = this.decompressData(draftData);
            }
            
            return {
                timestamp: draftData.timestamp,
                version: draftData.version,
                hasPhoto: !!(draftData.formData && draftData.formData.photo),
                hasSignature: !!(draftData.formData && draftData.formData.signature),
                hasIdProof: !!(draftData.formData && draftData.formData.idProof),
                completionPercentage: this.calculateCompletionPercentage(draftData.formData)
            };
            
        } catch (error) {
            console.error('Failed to get draft info:', error);
            return null;
        }
    }
    
    // Form submission history
    saveToHistory(formData, submissionResult) {
        try {
            const historyItem = {
                id: this.generateId(),
                formData: this.sanitizeData(formData),
                submissionResult: submissionResult,
                timestamp: new Date().toISOString(),
                success: submissionResult.success || false
            };
            
            let history = this.getHistory();
            history.unshift(historyItem); // Add to beginning
            
            // Keep only recent items
            if (history.length > this.maxHistoryItems) {
                history = history.slice(0, this.maxHistoryItems);
            }
            
            localStorage.setItem(this.formHistoryKey, JSON.stringify(history));
            
            console.log('Form saved to history');
            return historyItem.id;
            
        } catch (error) {
            console.error('Failed to save to history:', error);
            return null;
        }
    }
    
    getHistory() {
        try {
            const historyData = localStorage.getItem(this.formHistoryKey);
            return historyData ? JSON.parse(historyData) : [];
        } catch (error) {
            console.error('Failed to get history:', error);
            return [];
        }
    }
    
    clearHistory() {
        try {
            localStorage.removeItem(this.formHistoryKey);
            console.log('History cleared successfully');
            return true;
        } catch (error) {
            console.error('Failed to clear history:', error);
            return false;
        }
    }
    
    getHistoryItem(id) {
        try {
            const history = this.getHistory();
            return history.find(item => item.id === id) || null;
        } catch (error) {
            console.error('Failed to get history item:', error);
            return null;
        }
    }
    
    // Settings management
    saveSettings(settings) {
        try {
            const settingsData = {
                ...settings,
                timestamp: new Date().toISOString()
            };
            
            localStorage.setItem(this.settingsKey, JSON.stringify(settingsData));
            console.log('Settings saved successfully');
            return true;
            
        } catch (error) {
            console.error('Failed to save settings:', error);
            return false;
        }
    }
    
    loadSettings() {
        try {
            const settingsData = localStorage.getItem(this.settingsKey);
            return settingsData ? JSON.parse(settingsData) : this.getDefaultSettings();
        } catch (error) {
            console.error('Failed to load settings:', error);
            return this.getDefaultSettings();
        }
    }
    
    getDefaultSettings() {
        return {
            theme: 'light',
            autoSave: true,
            autoSaveInterval: 30000, // 30 seconds
            notifications: true,
            dataRetention: 30, // days
            compressionEnabled: true
        };
    }
    
    // Data utilities
    sanitizeData(data) {
        const sanitized = { ...data };
        
        // Remove sensitive or unnecessary data
        delete sanitized.password;
        delete sanitized.token;
        delete sanitized.apiKey;
        
        // Limit large data fields
        if (sanitized.photo && sanitized.photo.length > 500000) {
            // Compress large images
            sanitized.photo = this.compressImage(sanitized.photo);
        }
        
        if (sanitized.signature && sanitized.signature.length > 100000) {
            sanitized.signature = this.compressImage(sanitized.signature);
        }
        
        if (sanitized.idProof && sanitized.idProof.length > 500000) {
            sanitized.idProof = this.compressImage(sanitized.idProof);
        }
        
        return sanitized;
    }
    
    validateDraftData(draftData) {
        if (!draftData || typeof draftData !== 'object') {
            return false;
        }
        
        // Check required structure
        if (!draftData.formData || !draftData.timestamp) {
            return false;
        }
        
        // Validate timestamp
        const timestamp = new Date(draftData.timestamp);
        if (isNaN(timestamp.getTime())) {
            return false;
        }
        
        return true;
    }
    
    isDraftExpired(timestamp, maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 days
        const draftDate = new Date(timestamp);
        const now = new Date();
        return (now.getTime() - draftDate.getTime()) > maxAge;
    }
    
    calculateCompletionPercentage(formData) {
        if (!formData) return 0;
        
        const requiredFields = [
            'fullName', 'dateOfBirth', 'gender', 'email', 'phone', 'address',
            'guardianName', 'relation', 'guardianPhone',
            'roomNumber', 'admissionDate', 'stayDuration'
        ];
        
        const optionalFields = ['photo', 'signature', 'idProof'];
        
        let completed = 0;
        let total = requiredFields.length + optionalFields.length;
        
        requiredFields.forEach(field => {
            if (formData[field] && formData[field].trim()) {
                completed++;
            }
        });
        
        optionalFields.forEach(field => {
            if (formData[field]) {
                completed++;
            }
        });
        
        return Math.round((completed / total) * 100);
    }
    
    // Compression utilities
    compressData(data) {
        try {
            const jsonString = JSON.stringify(data);
            const compressed = this.simpleCompress(jsonString);
            
            return {
                compressed: true,
                data: compressed,
                originalSize: jsonString.length,
                compressedSize: compressed.length
            };
        } catch (error) {
            console.error('Compression failed:', error);
            return data; // Return original if compression fails
        }
    }
    
    decompressData(compressedData) {
        try {
            if (!compressedData.compressed) {
                return compressedData;
            }
            
            const decompressed = this.simpleDecompress(compressedData.data);
            return JSON.parse(decompressed);
        } catch (error) {
            console.error('Decompression failed:', error);
            throw new Error('Failed to decompress stored data');
        }
    }
    
    simpleCompress(str) {
        // Simple compression using run-length encoding for repeated patterns
        return str.replace(/(.)\1+/g, (match, char) => {
            return match.length > 3 ? `${char}*${match.length}` : match;
        });
    }
    
    simpleDecompress(str) {
        // Simple decompression
        return str.replace(/(.)\*(\d+)/g, (match, char, count) => {
            return char.repeat(parseInt(count));
        });
    }
    
    compressImage(dataURL, quality = 0.7) {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            return new Promise((resolve) => {
                img.onload = () => {
                    // Reduce dimensions
                    const maxWidth = 400;
                    const maxHeight = 400;
                    
                    let { width, height } = img;
                    
                    if (width > height) {
                        if (width > maxWidth) {
                            height = (height * maxWidth) / width;
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width = (width * maxHeight) / height;
                            height = maxHeight;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                
                img.src = dataURL;
            });
        } catch (error) {
            console.error('Image compression failed:', error);
            return dataURL; // Return original if compression fails
        }
    }
    
    // Storage management
    getStorageUsage() {
        try {
            let totalSize = 0;
            const items = {};
            
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    const size = localStorage[key].length;
                    totalSize += size;
                    items[key] = size;
                }
            }
            
            return {
                totalSize,
                items,
                available: this.getAvailableStorage(),
                percentage: (totalSize / this.getStorageLimit()) * 100
            };
        } catch (error) {
            console.error('Failed to get storage usage:', error);
            return null;
        }
    }
    
    getStorageLimit() {
        // Most browsers have a 5-10MB limit for localStorage
        return 5 * 1024 * 1024; // 5MB
    }
    
    getAvailableStorage() {
        return this.getStorageLimit() - this.getTotalStorageUsed();
    }
    
    getTotalStorageUsed() {
        let total = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += localStorage[key].length;
            }
        }
        return total;
    }
    
    cleanupOldData(maxAge = 30 * 24 * 60 * 60 * 1000) { // 30 days
        try {
            const now = new Date().getTime();
            let cleaned = 0;
            
            // Clean old history items
            const history = this.getHistory();
            const validHistory = history.filter(item => {
                const itemAge = now - new Date(item.timestamp).getTime();
                return itemAge < maxAge;
            });
            
            if (validHistory.length !== history.length) {
                localStorage.setItem(this.formHistoryKey, JSON.stringify(validHistory));
                cleaned += history.length - validHistory.length;
            }
            
            console.log(`Cleaned up ${cleaned} old items`);
            return cleaned;
            
        } catch (error) {
            console.error('Failed to cleanup old data:', error);
            return 0;
        }
    }
    
    // Utility methods
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    getAppVersion() {
        return '1.0.0'; // Could be dynamic
    }
    
    handleStorageError(error) {
        if (error.name === 'QuotaExceededError') {
            console.warn('Storage quota exceeded, attempting cleanup...');
            this.cleanupOldData();
            
            // Try to free up space by compressing data
            if (!this.compressionEnabled) {
                this.compressionEnabled = true;
                console.log('Enabled compression due to storage constraints');
            }
        }
    }
    
    // Export/Import functionality
    exportData() {
        try {
            const exportData = {
                draft: this.loadDraft(),
                history: this.getHistory(),
                settings: this.loadSettings(),
                exportDate: new Date().toISOString(),
                version: this.getAppVersion()
            };
            
            return JSON.stringify(exportData, null, 2);
        } catch (error) {
            console.error('Failed to export data:', error);
            return null;
        }
    }
    
    importData(importDataString) {
        try {
            const importData = JSON.parse(importDataString);
            
            if (!importData.version) {
                throw new Error('Invalid import data format');
            }
            
            // Import draft
            if (importData.draft) {
                this.saveDraft(importData.draft);
            }
            
            // Import settings
            if (importData.settings) {
                this.saveSettings(importData.settings);
            }
            
            // Import history (merge, don't replace)
            if (importData.history && Array.isArray(importData.history)) {
                const currentHistory = this.getHistory();
                const mergedHistory = [...importData.history, ...currentHistory]
                    .slice(0, this.maxHistoryItems);
                localStorage.setItem(this.formHistoryKey, JSON.stringify(mergedHistory));
            }
            
            console.log('Data imported successfully');
            return true;
            
        } catch (error) {
            console.error('Failed to import data:', error);
            return false;
        }
    }
}

// Export for use in other modules
window.StorageHandler = StorageHandler;
