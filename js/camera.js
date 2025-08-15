// Camera Handler for Photo Capture and Document Scanning
class CameraHandler {
    constructor() {
        this.stream = null;
        this.video = null;
        this.canvas = null;
        this.photoData = null;
        this.isScanning = false;
        
        this.init();
    }
    
    init() {
        this.video = document.getElementById('cameraVideo');
        this.canvas = document.getElementById('photoCanvas');
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        const startCameraBtn = document.getElementById('startCamera');
        const capturePhotoBtn = document.getElementById('capturePhoto');
        const retakePhotoBtn = document.getElementById('retakePhoto');
        
        startCameraBtn.addEventListener('click', () => {
            this.startCamera();
        });
        
        capturePhotoBtn.addEventListener('click', () => {
            this.capturePhoto();
        });
        
        retakePhotoBtn.addEventListener('click', () => {
            this.retakePhoto();
        });
    }
    
    async startCamera() {
        try {
            // Request camera access
            const constraints = {
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: this.isScanning ? 'environment' : 'user'
                }
            };
            
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;
            
            // Update UI
            document.getElementById('startCamera').style.display = 'none';
            document.getElementById('capturePhoto').style.display = 'inline-flex';
            
            // Show video preview
            this.video.style.display = 'block';
            
            window.showAppSuccess('Camera started successfully');
            
        } catch (error) {
            console.error('Camera access error:', error);
            this.handleCameraError(error);
        }
    }
    
    capturePhoto() {
        if (!this.video || !this.canvas) return;
        
        const context = this.canvas.getContext('2d');
        
        // Set canvas dimensions to match video
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        
        // Draw video frame to canvas
        context.drawImage(this.video, 0, 0);
        
        // Get image data
        const imageData = this.canvas.toDataURL('image/jpeg', 0.8);
        
        // Compress image
        this.compressImage(imageData, (compressedData) => {
            this.photoData = compressedData;
            this.showPhotoPreview(compressedData);
            this.stopCamera();
            
            // Update form data
            window.addToFormData('photo', compressedData);
            
            window.showAppSuccess('Photo captured successfully');
        });
    }
    
    compressImage(dataUrl, callback, quality = 0.7, maxWidth = 400) {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Calculate new dimensions
            const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
            const newWidth = img.width * ratio;
            const newHeight = img.height * ratio;
            
            canvas.width = newWidth;
            canvas.height = newHeight;
            
            // Draw and compress
            ctx.drawImage(img, 0, 0, newWidth, newHeight);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            
            callback(compressedDataUrl);
        };
        img.src = dataUrl;
    }
    
    showPhotoPreview(dataUrl) {
        const preview = document.getElementById('photoPreview');
        const image = document.getElementById('capturedPhoto');
        
        image.src = dataUrl;
        preview.style.display = 'block';
        
        // Update UI
        document.getElementById('capturePhoto').style.display = 'none';
        document.getElementById('retakePhoto').style.display = 'inline-flex';
    }
    
    retakePhoto() {
        // Clear current photo
        this.photoData = null;
        window.addToFormData('photo', null);
        
        // Hide preview
        document.getElementById('photoPreview').style.display = 'none';
        
        // Reset UI
        document.getElementById('retakePhoto').style.display = 'none';
        document.getElementById('startCamera').style.display = 'inline-flex';
        
        // Hide video
        this.video.style.display = 'none';
    }
    
    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        this.video.style.display = 'none';
    }
    
    async scanDocument() {
        this.isScanning = true;
        
        try {
            // Start camera for document scanning
            const constraints = {
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'environment' // Use back camera for documents
                }
            };
            
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // Create temporary video element for scanning
            const scanVideo = document.createElement('video');
            scanVideo.srcObject = this.stream;
            scanVideo.autoplay = true;
            scanVideo.playsinline = true;
            
            // Create scan modal
            this.createScanModal(scanVideo);
            
        } catch (error) {
            console.error('Document scan error:', error);
            this.handleCameraError(error);
        }
    }
    
    createScanModal(video) {
        const modal = document.createElement('div');
        modal.className = 'scan-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        const scanContainer = document.createElement('div');
        scanContainer.style.cssText = `
            position: relative;
            max-width: 90%;
            max-height: 70%;
        `;
        
        video.style.cssText = `
            width: 100%;
            height: auto;
            border-radius: 8px;
        `;
        
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            border: 2px solid #fff;
            width: 80%;
            height: 60%;
            border-radius: 8px;
            pointer-events: none;
        `;
        
        const instructions = document.createElement('div');
        instructions.innerHTML = `
            <p style="color: white; text-align: center; margin-bottom: 1rem; font-size: 1.1rem;">
                Position your ID document within the frame
            </p>
        `;
        
        const controls = document.createElement('div');
        controls.style.cssText = `
            display: flex;
            gap: 1rem;
            margin-top: 1rem;
        `;
        
        const captureBtn = document.createElement('button');
        captureBtn.innerHTML = '<i class="fas fa-camera"></i> Capture';
        captureBtn.className = 'camera-btn';
        captureBtn.addEventListener('click', () => {
            this.captureDocument(video, modal);
        });
        
        const cancelBtn = document.createElement('button');
        cancelBtn.innerHTML = '<i class="fas fa-times"></i> Cancel';
        cancelBtn.className = 'camera-btn';
        cancelBtn.style.background = '#ef4444';
        cancelBtn.addEventListener('click', () => {
            this.cancelScan(modal);
        });
        
        controls.appendChild(captureBtn);
        controls.appendChild(cancelBtn);
        
        scanContainer.appendChild(video);
        scanContainer.appendChild(overlay);
        
        modal.appendChild(instructions);
        modal.appendChild(scanContainer);
        modal.appendChild(controls);
        
        document.body.appendChild(modal);
        
        // Start video
        video.play();
    }
    
    captureDocument(video, modal) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        context.drawImage(video, 0, 0);
        
        const imageData = canvas.toDataURL('image/jpeg', 0.9);
        
        // Process and compress the document image
        this.compressImage(imageData, (compressedData) => {
            // Update form data
            // Add to multiple ID proofs array
            if (!window.app.formData.idProofs) {
                window.app.formData.idProofs = [];
            }
            if (window.app.formData.idProofs.length < 5) {
                window.app.formData.idProofs.push(compressedData);
                window.app.updateIdProofDisplay();
            } else {
                alert('Maximum 5 ID proof documents allowed');
            }
            
            // Multiple ID proof display is updated above
            
            // Close modal
            this.cancelScan(modal);
            
            window.showAppSuccess('Document scanned successfully');
        }, 0.8, 800);
    }
    
    cancelScan(modal) {
        this.stopCamera();
        document.body.removeChild(modal);
        this.isScanning = false;
    }
    
    setPhotoPreview(dataUrl) {
        this.photoData = dataUrl;
        this.showPhotoPreview(dataUrl);
    }
    
    handleCameraError(error) {
        let message = 'Camera access failed. ';
        
        if (error.name === 'NotAllowedError') {
            message += 'Please allow camera access and try again.';
        } else if (error.name === 'NotFoundError') {
            message += 'No camera found on this device.';
        } else if (error.name === 'NotSupportedError') {
            message += 'Camera not supported on this device.';
        } else {
            message += 'Please check your camera and try again.';
        }
        
        window.showAppError(message);
    }
    
    // Utility methods
    getPhotoData() {
        return this.photoData;
    }
    
    hasPhoto() {
        return !!this.photoData;
    }
    
    clearPhoto() {
        this.photoData = null;
        this.retakePhoto();
    }
    
    // Image processing utilities
    applyFilters(canvas, filters = {}) {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Apply brightness and contrast
        if (filters.brightness || filters.contrast) {
            const brightness = filters.brightness || 0;
            const contrast = filters.contrast || 1;
            
            for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.min(255, Math.max(0, contrast * (data[i] - 128) + 128 + brightness));
                data[i + 1] = Math.min(255, Math.max(0, contrast * (data[i + 1] - 128) + 128 + brightness));
                data[i + 2] = Math.min(255, Math.max(0, contrast * (data[i + 2] - 128) + 128 + brightness));
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
    }
    
    // Auto-crop document (basic implementation)
    detectDocumentEdges(canvas) {
        // This is a simplified edge detection
        // In a real implementation, you might use libraries like OpenCV.js
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // For now, return original canvas
        // In production, implement proper edge detection and perspective correction
        return canvas;
    }
}

// Export for use in other modules
window.CameraHandler = CameraHandler;
