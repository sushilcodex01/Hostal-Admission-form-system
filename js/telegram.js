// Telegram Bot API Integration Handler
class TelegramHandler {
    constructor() {
        this.botToken = this.getBotToken();
        this.chatId = this.getChatId();
        this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
        this.maxFileSize = 50 * 1024 * 1024; // 50MB limit
        this.retryAttempts = 3;
        this.retryDelay = 2000; // 2 seconds
        
        // Validate configuration
        if (!this.botToken || !this.chatId) {
            console.error('Telegram configuration invalid:', {
                botToken: !!this.botToken,
                chatId: !!this.chatId
            });
        }
    }
    
    getBotToken() {
        // Get bot token from server-side environment variables only
        // Frontend should not have direct access to bot token for security
        console.warn('Bot token should be handled server-side only for security');
        return null;
    }
    
    getChatId() {
        // Get chat ID from server-side environment variables only  
        // Frontend should not have direct access to chat ID for security
        console.warn('Chat ID should be handled server-side only for security');
        return null;
    }
    
    getEnvVariable(name) {
        // Try different ways to get environment variables
        if (typeof process !== 'undefined' && process.env) {
            return process.env[name];
        }
        
        // Check for global variables
        if (typeof window !== 'undefined' && window[name]) {
            return window[name];
        }
        
        // Check localStorage for development
        if (typeof localStorage !== 'undefined') {
            return localStorage.getItem(name);
        }
        
        return null;
    }
    
    async submitApplication(formData, pdfBlob = null) {
        try {
            // Validate inputs
            if (!formData) {
                throw new Error('Missing form data');
            }
            
            console.log('Starting application submission via Python backend...');
            
            // Prepare form data for Python backend
            const submissionData = {
                fullName: formData.fullName,
                dateOfBirth: formData.dateOfBirth,
                gender: formData.gender,
                email: formData.email,
                phone: formData.phone,
                address: formData.address,
                guardianName: formData.guardianName,
                relation: formData.relation,
                guardianPhone: formData.guardianPhone,
                emergencyContact: formData.emergencyContact,
                roomNumber: formData.roomNumber,
                admissionDate: formData.admissionDate,
                stayDuration: formData.stayDuration,
                studentPhoto: formData.photo || formData.studentPhoto,
                signature: formData.signature,
                idProofs: formData.idProofs
            };
            
            // Send to Python backend
            const response = await fetch('/submit-application', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(submissionData)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to submit application');
            }
            
            const result = await response.json();
            
            if (result.success) {
                console.log('Application submitted successfully via Python backend');
                return true;
            } else {
                throw new Error(result.error || 'Unknown error occurred');
            }
            
        } catch (error) {
            console.error('Application submission error:', error);
            throw new Error(`Failed to submit application: ${error.message}`);
        }
    }
    
    createSubmissionMessage(formData) {
        const currentDate = new Date().toLocaleString();
        
        return `🏠 *NAVADAYA GIRLS HOSTAL - ADMISSION APPLICATION*

👤 *Student Details:*
• Name: ${formData.fullName || 'N/A'}
• DOB: ${this.formatDate(formData.dateOfBirth) || 'N/A'}
• Gender: ${this.capitalize(formData.gender) || 'N/A'}
• Email: ${formData.email || 'N/A'}
• Phone: ${formData.phone || 'N/A'}
• Address: ${formData.address || 'N/A'}

👥 *Guardian Details:*
• Name: ${formData.guardianName || 'N/A'}
• Relation: ${this.capitalize(formData.relation) || 'N/A'}
• Phone: ${formData.guardianPhone || 'N/A'}
• Emergency: ${formData.emergencyContact || 'N/A'}

🏢 *Hostal Information:*
• Room No: ${formData.roomNumber || 'N/A'}
• Admission Date: ${this.formatDate(formData.admissionDate) || 'N/A'}
• Duration: ${formData.stayDuration || 'N/A'}

📅 *Submitted:* ${currentDate}
🤖 *Via:* Navadaya Girls Hostal Management System

---
Please review the attached documents and process this application.`;
    }
    
    async sendMessage(text, parseMode = 'Markdown') {
        const url = `${this.apiUrl}/sendMessage`;
        const data = {
            chat_id: this.chatId,
            text: text,
            parse_mode: parseMode
        };
        
        return await this.makeRequest(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
    }
    
    async sendDocument(fileBlob, filename, caption = '') {
        const url = `${this.apiUrl}/sendDocument`;
        const formData = new FormData();
        
        formData.append('chat_id', this.chatId);
        formData.append('document', fileBlob, filename);
        
        if (caption) {
            formData.append('caption', caption);
        }
        
        return await this.makeRequest(url, {
            method: 'POST',
            body: formData
        });
    }
    
    async sendPhoto(photoDataURL, caption = '') {
        const url = `${this.apiUrl}/sendPhoto`;
        const formData = new FormData();
        
        // Convert data URL to blob
        const photoBlob = this.dataURLToBlob(photoDataURL);
        
        formData.append('chat_id', this.chatId);
        formData.append('photo', photoBlob, 'student-photo.jpg');
        
        if (caption) {
            formData.append('caption', caption);
        }
        
        return await this.makeRequest(url, {
            method: 'POST',
            body: formData
        });
    }
    
    async makeRequest(url, options, attempt = 1) {
        try {
            const response = await fetch(url, options);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`HTTP ${response.status}: ${errorData.description || response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.ok) {
                throw new Error(`Telegram API Error: ${data.description || 'Unknown error'}`);
            }
            
            return data;
            
        } catch (error) {
            console.error(`Telegram API request failed (attempt ${attempt}):`, error);
            
            // Retry logic
            if (attempt < this.retryAttempts && this.shouldRetry(error)) {
                console.log(`Retrying in ${this.retryDelay}ms...`);
                await this.sleep(this.retryDelay);
                return await this.makeRequest(url, options, attempt + 1);
            }
            
            throw error;
        }
    }
    
    shouldRetry(error) {
        // Retry on network errors or temporary server errors
        return error.message.includes('fetch') || 
               error.message.includes('network') ||
               error.message.includes('429') || // Rate limit
               error.message.includes('502') || // Bad gateway
               error.message.includes('503') || // Service unavailable
               error.message.includes('504');   // Gateway timeout
    }
    
    dataURLToBlob(dataURL) {
        const arr = dataURL.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        
        return new Blob([u8arr], { type: mime });
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    
    capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    
    // Utility methods for testing and debugging
    async testConnection() {
        try {
            const url = `${this.apiUrl}/getMe`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.ok) {
                console.log('Telegram Bot connection successful:', data.result);
                return true;
            } else {
                console.error('Telegram Bot connection failed:', data);
                return false;
            }
        } catch (error) {
            console.error('Telegram connection test failed:', error);
            return false;
        }
    }
    
    async getChatInfo() {
        try {
            const url = `${this.apiUrl}/getChat`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: this.chatId })
            });
            const data = await response.json();
            
            if (data.ok) {
                console.log('Chat info:', data.result);
                return data.result;
            } else {
                console.error('Failed to get chat info:', data);
                return null;
            }
        } catch (error) {
            console.error('Chat info request failed:', error);
            return null;
        }
    }
    
    // File size validation
    validateFileSize(blob, maxSize = this.maxFileSize) {
        if (blob.size > maxSize) {
            throw new Error(`File size (${Math.round(blob.size / 1024 / 1024)}MB) exceeds limit (${Math.round(maxSize / 1024 / 1024)}MB)`);
        }
        return true;
    }
    
    // Batch submission for multiple files
    async submitBatch(items) {
        const results = [];
        
        for (const item of items) {
            try {
                let result;
                
                switch (item.type) {
                    case 'message':
                        result = await this.sendMessage(item.text, item.parseMode);
                        break;
                    case 'document':
                        result = await this.sendDocument(item.file, item.filename, item.caption);
                        break;
                    case 'photo':
                        result = await this.sendPhoto(item.dataURL, item.caption);
                        break;
                    default:
                        throw new Error(`Unknown item type: ${item.type}`);
                }
                
                results.push({ success: true, result });
                
                // Small delay between requests to avoid rate limiting
                await this.sleep(500);
                
            } catch (error) {
                results.push({ success: false, error: error.message });
                console.error(`Batch item failed:`, error);
            }
        }
        
        return results;
    }
    
    // Configuration validation
    validateConfiguration() {
        const errors = [];
        
        if (!this.botToken || this.botToken.length < 20) {
            errors.push('Invalid or missing bot token');
        }
        
        if (!this.chatId) {
            errors.push('Invalid or missing chat ID');
        }
        
        if (errors.length > 0) {
            throw new Error(`Telegram configuration errors: ${errors.join(', ')}`);
        }
        
        return true;
    }
}

// Export for use in other modules
window.TelegramHandler = TelegramHandler;
