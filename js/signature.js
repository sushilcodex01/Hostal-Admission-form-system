// Digital Signature Handler
class SignatureHandler {
    constructor() {
        this.signaturePad = null;
        this.canvas = null;
        this.signatureData = null;
        
        this.init();
    }
    
    init() {
        // Wait a bit for DOM to be fully ready
        setTimeout(() => {
            this.canvas = document.getElementById('signaturePad');
            
            if (this.canvas) {
                this.setupSignaturePad();
                this.setupEventListeners();
                this.resizeCanvas();
            } else {
                console.warn('Signature canvas not found, retrying...');
                // Retry after a longer delay
                setTimeout(() => this.init(), 1000);
            }
            
            // Handle window resize
            window.addEventListener('resize', () => {
                this.resizeCanvas();
            });
        }, 100);
    }
    
    setupSignaturePad() {
        if (!this.canvas) return;
        
        // Check if SignaturePad is available
        if (typeof SignaturePad === 'undefined') {
            console.error('SignaturePad library not loaded');
            return;
        }
        
        try {
            // Initialize SignaturePad
            this.signaturePad = new SignaturePad(this.canvas, {
                backgroundColor: 'rgba(255, 255, 255, 1)',
                penColor: 'rgb(0, 0, 0)',
                velocityFilterWeight: 0.7,
                minWidth: 1,
                maxWidth: 3,
                throttle: 16,
                minDistance: 5,
            });
            
            // Handle signature completion
            this.signaturePad.addEventListener('endStroke', () => {
                this.saveSignature();
            });
            
            console.log('SignaturePad initialized successfully');
        } catch (error) {
            console.error('Failed to initialize SignaturePad:', error);
        }
    }
    
    setupEventListeners() {
        const clearBtn = document.getElementById('clearSignature');
        const undoBtn = document.getElementById('undoSignature');
        
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearSignature();
            });
        }
        
        if (undoBtn) {
            undoBtn.addEventListener('click', () => {
                this.undoSignature();
            });
        }
    }
    
    resizeCanvas() {
        if (!this.canvas || !this.signaturePad) return;
        
        try {
            const ratio = Math.max(window.devicePixelRatio || 1, 1);
            const rect = this.canvas.getBoundingClientRect();
            
            // Don't resize if canvas has no dimensions yet
            if (rect.width === 0 || rect.height === 0) return;
            
            // Save current signature data
            const currentData = this.signaturePad.toDataURL();
            
            // Set canvas size
            this.canvas.width = rect.width * ratio;
            this.canvas.height = rect.height * ratio;
            
            // Scale context
            const ctx = this.canvas.getContext('2d');
            ctx.scale(ratio, ratio);
            
            // Set canvas styles
            this.canvas.style.width = rect.width + 'px';
            this.canvas.style.height = rect.height + 'px';
            
            // Clear and redraw signature pad
            this.signaturePad.clear();
            if (this.signatureData && this.signatureData !== 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==') {
                this.signaturePad.fromDataURL(this.signatureData);
            }
        } catch (error) {
            console.error('Error resizing canvas:', error);
        }
    }
    
    saveSignature() {
        if (!this.signaturePad || this.signaturePad.isEmpty()) {
            this.signatureData = null;
            window.addToFormData('signature', null);
            return;
        }
        
        // Get signature data
        const dataURL = this.signaturePad.toDataURL('image/png');
        
        // Trim whitespace
        this.trimSignature(dataURL).then(trimmedDataURL => {
            this.signatureData = trimmedDataURL;
            window.addToFormData('signature', trimmedDataURL);
            
            // Visual feedback
            this.canvas.classList.add('glow');
            setTimeout(() => {
                this.canvas.classList.remove('glow');
            }, 1000);
        });
    }
    
    trimSignature(dataURL) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                
                let top = canvas.height, bottom = 0, left = canvas.width, right = 0;
                
                // Find bounds of non-transparent pixels
                for (let y = 0; y < canvas.height; y++) {
                    for (let x = 0; x < canvas.width; x++) {
                        const alpha = data[(y * canvas.width + x) * 4 + 3];
                        if (alpha > 0) {
                            top = Math.min(top, y);
                            bottom = Math.max(bottom, y);
                            left = Math.min(left, x);
                            right = Math.max(right, x);
                        }
                    }
                }
                
                if (top < bottom && left < right) {
                    // Add padding
                    const padding = 10;
                    top = Math.max(0, top - padding);
                    bottom = Math.min(canvas.height, bottom + padding);
                    left = Math.max(0, left - padding);
                    right = Math.min(canvas.width, right + padding);
                    
                    // Create trimmed canvas
                    const trimmedCanvas = document.createElement('canvas');
                    const trimmedCtx = trimmedCanvas.getContext('2d');
                    
                    trimmedCanvas.width = right - left;
                    trimmedCanvas.height = bottom - top;
                    
                    trimmedCtx.drawImage(
                        canvas,
                        left, top, right - left, bottom - top,
                        0, 0, right - left, bottom - top
                    );
                    
                    resolve(trimmedCanvas.toDataURL('image/png'));
                } else {
                    resolve(dataURL);
                }
            };
            img.src = dataURL;
        });
    }
    
    clearSignature() {
        if (this.signaturePad) {
            this.signaturePad.clear();
            this.signatureData = null;
            window.addToFormData('signature', null);
            
            // Visual feedback
            this.canvas.classList.add('shake');
            setTimeout(() => {
                this.canvas.classList.remove('shake');
            }, 500);
        }
    }
    
    undoSignature() {
        if (this.signaturePad) {
            const data = this.signaturePad.toData();
            if (data.length > 0) {
                data.pop(); // Remove last stroke
                this.signaturePad.fromData(data);
                this.saveSignature();
            }
        }
    }
    
    loadSignature(dataURL) {
        if (this.signaturePad && dataURL) {
            this.signatureData = dataURL;
            this.signaturePad.fromDataURL(dataURL);
        }
    }
    
    getSignatureData() {
        return this.signatureData;
    }
    
    hasSignature() {
        return !!this.signatureData && !this.signaturePad?.isEmpty();
    }
    
    // Advanced signature features
    setSignatureStyle(options = {}) {
        if (this.signaturePad) {
            Object.assign(this.signaturePad, {
                penColor: options.color || 'rgb(0, 0, 0)',
                minWidth: options.minWidth || 1,
                maxWidth: options.maxWidth || 3,
                velocityFilterWeight: options.smoothing || 0.7
            });
        }
    }
    
    exportSignature(format = 'png', quality = 1.0) {
        if (!this.signaturePad || this.signaturePad.isEmpty()) {
            return null;
        }
        
        switch (format.toLowerCase()) {
            case 'svg':
                return this.signaturePad.toSVG();
            case 'jpg':
            case 'jpeg':
                return this.signaturePad.toDataURL('image/jpeg', quality);
            default:
                return this.signaturePad.toDataURL('image/png');
        }
    }
    
    // Signature validation
    validateSignature() {
        if (!this.signaturePad || this.signaturePad.isEmpty()) {
            return {
                valid: false,
                message: 'Signature is required'
            };
        }
        
        const data = this.signaturePad.toData();
        const totalPoints = data.reduce((sum, stroke) => sum + stroke.points.length, 0);
        
        if (totalPoints < 10) {
            return {
                valid: false,
                message: 'Signature appears too simple. Please provide a more detailed signature.'
            };
        }
        
        // Check signature area
        const bounds = this.getSignatureBounds();
        const area = (bounds.right - bounds.left) * (bounds.bottom - bounds.top);
        const canvasArea = this.canvas.width * this.canvas.height;
        
        if (area < canvasArea * 0.01) {
            return {
                valid: false,
                message: 'Signature appears too small. Please sign larger.'
            };
        }
        
        return {
            valid: true,
            message: 'Signature is valid'
        };
    }
    
    getSignatureBounds() {
        if (!this.signaturePad || this.signaturePad.isEmpty()) {
            return { left: 0, top: 0, right: 0, bottom: 0 };
        }
        
        const data = this.signaturePad.toData();
        let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
        
        data.forEach(stroke => {
            stroke.points.forEach(point => {
                left = Math.min(left, point.x);
                top = Math.min(top, point.y);
                right = Math.max(right, point.x);
                bottom = Math.max(bottom, point.y);
            });
        });
        
        return { left, top, right, bottom };
    }
    
    // Signature analysis
    analyzeSignature() {
        if (!this.signaturePad || this.signaturePad.isEmpty()) {
            return null;
        }
        
        const data = this.signaturePad.toData();
        const bounds = this.getSignatureBounds();
        
        return {
            strokeCount: data.length,
            totalPoints: data.reduce((sum, stroke) => sum + stroke.points.length, 0),
            bounds: bounds,
            area: (bounds.right - bounds.left) * (bounds.bottom - bounds.top),
            complexity: this.calculateComplexity(data)
        };
    }
    
    calculateComplexity(data) {
        let totalDistance = 0;
        let directionChanges = 0;
        
        data.forEach(stroke => {
            const points = stroke.points;
            for (let i = 1; i < points.length; i++) {
                const dx = points[i].x - points[i-1].x;
                const dy = points[i].y - points[i-1].y;
                totalDistance += Math.sqrt(dx * dx + dy * dy);
                
                if (i > 1) {
                    const prevDx = points[i-1].x - points[i-2].x;
                    const prevDy = points[i-1].y - points[i-2].y;
                    const angle = Math.atan2(dy, dx) - Math.atan2(prevDy, prevDx);
                    if (Math.abs(angle) > Math.PI / 4) {
                        directionChanges++;
                    }
                }
            }
        });
        
        return {
            totalDistance,
            directionChanges,
            complexity: (directionChanges / totalDistance) * 1000
        };
    }
}

// Export for use in other modules
window.SignatureHandler = SignatureHandler;
