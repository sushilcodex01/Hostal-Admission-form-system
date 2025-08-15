// Main Application Controller
class HostelAdmissionApp {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 7;
        this.formData = {
            idProofs: [] // Initialize as array for multiple ID proofs
        };
        this.isDarkTheme = false;
        
        this.init();
    }
    
    init() {
        this.loadTheme();
        this.setupEventListeners();
        this.updateProgress();
        this.loadDraftData();
        this.initializeComponents();
    }
    
    initializeComponents() {
        // Initialize camera component
        window.cameraHandler = new CameraHandler();
        
        // Initialize signature component
        window.signatureHandler = new SignatureHandler();
        
        // Initialize PDF generator
        window.pdfGenerator = new PDFGenerator();
        
        // Initialize Telegram integration
        window.telegramHandler = new TelegramHandler();
        
        // Initialize storage handler
        window.storageHandler = new StorageHandler();
        
        // Initialize validation
        window.validationHandler = new ValidationHandler();
    }
    
    setupEventListeners() {
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });
        
        // Navigation buttons
        document.getElementById('nextBtn').addEventListener('click', () => {
            this.nextStep();
        });
        
        document.getElementById('prevBtn').addEventListener('click', () => {
            this.prevStep();
        });
        
        // Save draft button
        document.getElementById('saveDraftBtn').addEventListener('click', () => {
            this.saveDraft();
        });
        
        // Form submission
        document.getElementById('admissionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitForm();
        });
        
        // Form input listeners for real-time validation
        this.setupFormValidation();
        
        // ID Proof upload
        this.setupIdProofUpload();
        
        // Step navigation
        this.setupStepNavigation();
    }
    
    setupFormValidation() {
        const inputs = document.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                window.validationHandler.validateField(input);
            });
            
            input.addEventListener('input', () => {
                this.updateFormData();
                // Clear error on input
                const errorElement = input.parentElement.querySelector('.error-message');
                if (errorElement) {
                    errorElement.textContent = '';
                    input.parentElement.classList.remove('error');
                }
            });
        });
    }
    
    setupIdProofUpload() {
        const fileInput = document.getElementById('idProofFile');
        const scanBtn = document.getElementById('scanIdBtn');
        const removeBtn = document.getElementById('removeIdProof');
        
        fileInput.addEventListener('change', (e) => {
            this.handleMultipleIdProofUpload(e.target.files);
        });
        
        scanBtn.addEventListener('click', () => {
            window.cameraHandler.scanDocument();
        });
        
        // Remove button handling is now per-item in updateIdProofDisplay
    }
    
    setupStepNavigation() {
        const steps = document.querySelectorAll('.step');
        steps.forEach((step, index) => {
            step.addEventListener('click', () => {
                if (index + 1 <= this.currentStep || this.isStepCompleted(index + 1)) {
                    this.goToStep(index + 1);
                }
            });
        });
    }
    
    nextStep() {
        if (this.validateCurrentStep()) {
            if (this.currentStep < this.totalSteps) {
                this.currentStep++;
                this.updateStep();
                this.updateProgress();
                this.updateReviewSection();
            }
        }
    }
    
    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateStep();
            this.updateProgress();
        }
    }
    
    goToStep(stepNumber) {
        if (stepNumber >= 1 && stepNumber <= this.totalSteps) {
            this.currentStep = stepNumber;
            this.updateStep();
            this.updateProgress();
            this.updateReviewSection();
        }
    }
    
    updateStep() {
        // Hide all steps
        document.querySelectorAll('.form-step').forEach(step => {
            step.classList.remove('active');
        });
        
        // Show current step
        const currentStepElement = document.getElementById(`step${this.currentStep}`);
        if (currentStepElement) {
            currentStepElement.classList.add('active');
            currentStepElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        
        // Update navigation buttons
        this.updateNavigationButtons();
        
        // Update step indicators
        this.updateStepIndicators();
        
        // Add animation class
        setTimeout(() => {
            currentStepElement?.classList.add('fade-in');
        }, 50);
    }
    
    updateNavigationButtons() {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const submitBtn = document.getElementById('submitBtn');
        
        // Show/hide previous button
        prevBtn.style.display = this.currentStep > 1 ? 'flex' : 'none';
        
        // Show/hide next/submit buttons
        if (this.currentStep === this.totalSteps) {
            nextBtn.style.display = 'none';
            submitBtn.style.display = 'flex';
        } else {
            nextBtn.style.display = 'flex';
            submitBtn.style.display = 'none';
        }
    }
    
    updateStepIndicators() {
        const steps = document.querySelectorAll('.step');
        steps.forEach((step, index) => {
            const stepNumber = index + 1;
            step.classList.remove('active', 'completed');
            
            if (stepNumber === this.currentStep) {
                step.classList.add('active');
            } else if (stepNumber < this.currentStep) {
                step.classList.add('completed');
            }
        });
    }
    
    updateProgress() {
        const progressFill = document.getElementById('progressFill');
        const progressPercentage = (this.currentStep / this.totalSteps) * 100;
        progressFill.style.width = `${progressPercentage}%`;
    }
    
    validateCurrentStep() {
        const currentStepElement = document.getElementById(`step${this.currentStep}`);
        const inputs = currentStepElement.querySelectorAll('input[required], select[required], textarea[required]');
        
        let isValid = true;
        
        inputs.forEach(input => {
            if (!window.validationHandler.validateField(input)) {
                isValid = false;
            }
        });
        
        // Additional step-specific validations
        if (this.currentStep === 4 && (!this.formData.idProofs || this.formData.idProofs.length === 0)) {
            this.showError('Please upload or scan at least one ID proof');
            isValid = false;
        }
        
        if (this.currentStep === 5 && !this.formData.photo) {
            this.showError('Please capture your photo');
            isValid = false;
        }
        
        if (this.currentStep === 6 && !this.formData.signature) {
            this.showError('Please provide your digital signature');
            isValid = false;
        }
        
        return isValid;
    }
    
    isStepCompleted(stepNumber) {
        // Check if a step has all required data
        switch (stepNumber) {
            case 1:
                return this.formData.fullName && this.formData.dateOfBirth && 
                       this.formData.gender && this.formData.email && 
                       this.formData.phone && this.formData.address;
            case 2:
                return this.formData.guardianName && this.formData.relation && 
                       this.formData.guardianPhone;
            case 3:
                return this.formData.roomNumber && this.formData.admissionDate && 
                       this.formData.stayDuration;
            case 4:
                return this.formData.idProofs && this.formData.idProofs.length > 0;
            case 5:
                return this.formData.photo;
            case 6:
                return this.formData.signature;
            default:
                return false;
        }
    }
    
    updateFormData() {
        const form = document.getElementById('admissionForm');
        const formData = new FormData(form);
        
        for (let [key, value] of formData.entries()) {
            this.formData[key] = value;
        }
    }
    
    updateReviewSection() {
        if (this.currentStep === 7) {
            this.populateReviewData();
        }
    }
    
    populateReviewData() {
        // Student Details
        document.getElementById('reviewFullName').textContent = this.formData.fullName || '';
        document.getElementById('reviewDob').textContent = this.formData.dateOfBirth || '';
        document.getElementById('reviewGender').textContent = this.formData.gender || '';
        document.getElementById('reviewEmail').textContent = this.formData.email || '';
        document.getElementById('reviewPhone').textContent = this.formData.phone || '';
        document.getElementById('reviewAddress').textContent = this.formData.address || '';
        
        // Guardian Details
        document.getElementById('reviewGuardianName').textContent = this.formData.guardianName || '';
        document.getElementById('reviewRelation').textContent = this.formData.relation || '';
        document.getElementById('reviewGuardianPhone').textContent = this.formData.guardianPhone || '';
        document.getElementById('reviewEmergencyContact').textContent = this.formData.emergencyContact || '';
        
        // Hostel Details
        document.getElementById('reviewRoomNumber').textContent = this.formData.roomNumber || '';
        document.getElementById('reviewAdmissionDate').textContent = this.formData.admissionDate || '';
        document.getElementById('reviewStayDuration').textContent = this.formData.stayDuration || '';
        
        // Attachments
        this.populateAttachmentPreviews();
    }
    
    populateAttachmentPreviews() {
        // ID Proof
        const idProofPreview = document.getElementById('reviewIdProofs');
        if (this.formData.idProofs && this.formData.idProofs.length > 0) {
            const idProofHtml = this.formData.idProofs.map((proof, index) => 
                `<div class="review-id-proof-item">
                    <img src="${proof}" alt="ID Proof ${index + 1}">
                    <div class="doc-number">${index + 1}</div>
                </div>`
            ).join('');
            idProofPreview.innerHTML = `<div class="review-id-proofs">${idProofHtml}</div>`;
        } else {
            idProofPreview.innerHTML = '<span>Not uploaded</span>';
        }
        
        // Photo
        const photoPreview = document.getElementById('reviewPhoto');
        if (this.formData.photo) {
            photoPreview.innerHTML = `<img src="${this.formData.photo}" alt="Student Photo">`;
        } else {
            photoPreview.innerHTML = '<span>Not captured</span>';
        }
        
        // Signature
        const signaturePreview = document.getElementById('reviewSignature');
        if (this.formData.signature) {
            signaturePreview.innerHTML = `<img src="${this.formData.signature}" alt="Signature">`;
        } else {
            signaturePreview.innerHTML = '<span>Not provided</span>';
        }
    }
    
    handleMultipleIdProofUpload(files) {
        const maxFiles = 5;
        const currentCount = this.formData.idProofs ? this.formData.idProofs.length : 0;
        
        if (currentCount >= maxFiles) {
            this.showError(`Maximum ${maxFiles} ID proof documents allowed`);
            return;
        }
        
        const filesToProcess = Math.min(files.length, maxFiles - currentCount);
        
        for (let i = 0; i < filesToProcess; i++) {
            const file = files[i];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (!this.formData.idProofs) {
                        this.formData.idProofs = [];
                    }
                    this.formData.idProofs.push(e.target.result);
                    this.updateIdProofDisplay();
                };
                reader.readAsDataURL(file);
            }
        }
    }
    
    updateIdProofDisplay() {
        const container = document.getElementById('multipleIdProofPreview');
        const countElement = document.getElementById('idProofCount');
        const countNumber = document.getElementById('countNumber');
        
        if (!this.formData.idProofs || this.formData.idProofs.length === 0) {
            container.innerHTML = '';
            countElement.style.display = 'none';
            return;
        }
        
        countElement.style.display = 'block';
        countNumber.textContent = this.formData.idProofs.length;
        
        const previewHtml = this.formData.idProofs.map((proof, index) => 
            `<div class="id-proof-item" data-index="${index}">
                <img src="${proof}" alt="ID Proof ${index + 1}">
                <button type="button" class="remove-btn" onclick="window.app.removeIdProof(${index})">
                    <i class="fas fa-times"></i>
                </button>
                <div class="document-label">Document ${index + 1}</div>
            </div>`
        ).join('');
        
        container.innerHTML = previewHtml;
    }
    
    removeIdProof(index) {
        if (this.formData.idProofs && index >= 0 && index < this.formData.idProofs.length) {
            this.formData.idProofs.splice(index, 1);
            this.updateIdProofDisplay();
            document.getElementById('idProofFile').value = '';
        }
    }
    
    saveDraft() {
        this.updateFormData();
        try {
            if (window.storageHandler) {
                window.storageHandler.saveDraft(this.formData);
                this.showSuccess('Draft saved successfully!');
            } else {
                console.warn('Storage handler not available');
            }
        } catch (error) {
            console.error('Error saving draft:', error);
        }
    }
    
    loadDraftData() {
        try {
            if (window.storageHandler) {
                const draftData = window.storageHandler.loadDraft();
                if (draftData) {
                    this.formData = { ...this.formData, ...draftData };
                    this.populateFormFields();
                }
            }
        } catch (error) {
            console.error('Error loading draft data:', error);
        }
    }
    
    populateFormFields() {
        Object.keys(this.formData).forEach(key => {
            const element = document.getElementById(key);
            if (element && this.formData[key]) {
                if (element.type === 'file') return;
                element.value = this.formData[key];
            }
        });
        
        // Handle special fields
        if (this.formData.idProofs && this.formData.idProofs.length > 0) {
            this.updateIdProofDisplay();
        }
        
        if (this.formData.photo) {
            window.cameraHandler.setPhotoPreview(this.formData.photo);
        }
        
        if (this.formData.signature) {
            window.signatureHandler.loadSignature(this.formData.signature);
        }
    }
    
    async submitForm() {
        this.updateFormData();
        
        if (!this.validateAllSteps()) {
            this.showError('Please complete all required fields');
            return;
        }
        
        this.showLoading('Submitting application...');
        
        try {
            console.log('Starting form submission process...');
            console.log('Form data:', this.formData);
            
            // Submit to Telegram via Python backend (PDF will be generated server-side)
            await window.telegramHandler.submitApplication(this.formData);
            console.log('Application submission completed successfully');
            
            this.hideLoading();
            this.showSuccessModal();
            
            // Clear draft
            if (window.storageHandler) {
                window.storageHandler.clearDraft();
            }
            
        } catch (error) {
            this.hideLoading();
            console.error('Detailed submission error:', error);
            console.error('Error stack:', error.stack);
            
            // Show more specific error message
            const errorMessage = error.message || 'Unknown error occurred';
            this.showError(`Failed to submit application: ${errorMessage}`);
        }
    }
    
    validateAllSteps() {
        let isValid = true;
        
        for (let step = 1; step <= this.totalSteps - 1; step++) {
            if (!this.isStepCompleted(step)) {
                isValid = false;
                break;
            }
        }
        
        return isValid;
    }
    
    toggleTheme() {
        this.isDarkTheme = !this.isDarkTheme;
        const body = document.body;
        const themeIcon = document.querySelector('#themeToggle i');
        
        if (this.isDarkTheme) {
            body.setAttribute('data-theme', 'dark');
            themeIcon.className = 'fas fa-sun';
        } else {
            body.removeAttribute('data-theme');
            themeIcon.className = 'fas fa-moon';
        }
        
        localStorage.setItem('theme', this.isDarkTheme ? 'dark' : 'light');
    }
    
    loadTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            this.isDarkTheme = true;
            document.body.setAttribute('data-theme', 'dark');
            document.querySelector('#themeToggle i').className = 'fas fa-sun';
        }
    }
    
    showLoading(text = 'Processing...') {
        const overlay = document.getElementById('loadingOverlay');
        const loadingText = document.getElementById('loadingText');
        
        loadingText.textContent = text;
        overlay.style.display = 'flex';
    }
    
    updateLoadingText(text) {
        document.getElementById('loadingText').textContent = text;
    }
    
    hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
    }
    
    showSuccessModal() {
        document.getElementById('successModal').style.display = 'flex';
    }
    
    showError(message) {
        // Create and show error notification
        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <span>${message}</span>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--error-color);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: var(--shadow-lg);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            animation: slideInRight 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideInLeft 0.3s ease-out reverse';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 4000);
    }
    
    showSuccess(message) {
        // Create and show success notification
        const notification = document.createElement('div');
        notification.className = 'success-notification';
        notification.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--success-color);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: var(--shadow-lg);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            animation: slideInRight 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideInLeft 0.3s ease-out reverse';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}
