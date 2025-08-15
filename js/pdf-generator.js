// PDF Generator for Hostel Admission Form
class PDFGenerator {
    constructor() {
        this.doc = null;
        this.pageWidth = 210; // A4 width in mm
        this.pageHeight = 297; // A4 height in mm
        this.margin = 20;
        this.currentY = 0;
        this.colors = {
            primary: [59, 130, 246],
            secondary: [100, 116, 139],
            success: [16, 185, 129],
            warning: [245, 158, 11],
            error: [239, 68, 68],
            student: [239, 246, 255],
            guardian: [254, 252, 232],
            hostel: [240, 253, 244]
        };
    }
    
    async generatePDF(formData) {
        try {
            console.log('Starting PDF generation...');
            
            // Check if jsPDF is available
            if (typeof jsPDF === 'undefined') {
                throw new Error('jsPDF library not loaded');
            }
            
            // Initialize jsPDF
            this.doc = new jsPDF('p', 'mm', 'a4');
            this.currentY = this.margin;
            
            // Generate PDF content
            await this.addHeader();
            await this.addStudentSection(formData);
            await this.addGuardianSection(formData);
            await this.addHostelSection(formData);
            await this.addPhotoAndSignature(formData);
            await this.addFooter();
            
            // Generate blob
            const pdfBlob = this.doc.output('blob');
            console.log('PDF generated successfully, size:', pdfBlob.size);
            return pdfBlob;
            
        } catch (error) {
            console.error('PDF generation error:', error);
            throw new Error(`Failed to generate PDF: ${error.message}`);
        }
    }
    
    async addHeader() {
        const logoSize = 25;
        const headerHeight = 40;
        
        // Add logo (placeholder rectangle for now)
        this.doc.setFillColor(...this.colors.primary);
        this.doc.rect(this.margin, this.currentY, logoSize, logoSize, 'F');
        
        // Add white text over logo placeholder
        this.doc.setTextColor(255, 255, 255);
        this.doc.setFontSize(16);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text('LOGO', this.margin + logoSize/2, this.currentY + logoSize/2, { align: 'center' });
        
        // Add header text
        this.doc.setTextColor(0, 0, 0);
        this.doc.setFontSize(24);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text('NAVADAYA GIRLS HOSTAL', this.margin + logoSize + 10, this.currentY + 10);
        
        this.doc.setFontSize(18);
        this.doc.setFont('helvetica', 'normal');
        this.doc.text('Student Admission Form', this.margin + logoSize + 10, this.currentY + 20);
        
        this.doc.setFontSize(10);
        this.doc.setTextColor(...this.colors.secondary);
        this.doc.text('123 University Road, Education City', this.margin + logoSize + 10, this.currentY + 28);
        this.doc.text('Phone: +91 98765 43210 | Email: admission@navadayagirlshostal.com', this.margin + logoSize + 10, this.currentY + 34);
        
        // Add border line
        this.doc.setDrawColor(...this.colors.primary);
        this.doc.setLineWidth(2);
        this.doc.line(this.margin, this.currentY + headerHeight, this.pageWidth - this.margin, this.currentY + headerHeight);
        
        this.currentY += headerHeight + 10;
    }
    
    async addStudentSection(formData) {
        await this.addSectionHeader('Student Information', this.colors.student);
        
        const studentData = [
            ['Full Name', formData.fullName || ''],
            ['Date of Birth', this.formatDate(formData.dateOfBirth) || ''],
            ['Gender', this.capitalize(formData.gender) || ''],
            ['Email Address', formData.email || ''],
            ['Phone Number', formData.phone || ''],
            ['Address', formData.address || '']
        ];
        
        await this.addTable(studentData, this.colors.student);
        this.currentY += 10;
    }
    
    async addGuardianSection(formData) {
        await this.addSectionHeader('Parent/Guardian Information', this.colors.guardian);
        
        const guardianData = [
            ['Guardian Name', formData.guardianName || ''],
            ['Relation', this.capitalize(formData.relation) || ''],
            ['Contact Number', formData.guardianPhone || ''],
            ['Emergency Contact', formData.emergencyContact || 'N/A']
        ];
        
        await this.addTable(guardianData, this.colors.guardian);
        this.currentY += 10;
    }
    
    async addHostelSection(formData) {
        await this.addSectionHeader('Hostal Information', this.colors.hostel);
        
        const hostelData = [
            ['Room Number', formData.roomNumber || ''],
            ['Admission Date', this.formatDate(formData.admissionDate) || ''],
            ['Duration of Stay', formData.stayDuration || '']
        ];
        
        await this.addTable(hostelData, this.colors.hostel);
        this.currentY += 10;
    }
    
    async addPhotoAndSignature(formData) {
        // Check if we need a new page
        if (this.currentY > this.pageHeight - 100) {
            this.doc.addPage();
            this.currentY = this.margin;
        }
        
        const photoWidth = 40;
        const photoHeight = 50;
        const signatureWidth = 60;
        const signatureHeight = 30;
        
        // Add student photo
        if (formData.photo) {
            await this.addSectionHeader('Student Photograph', [255, 255, 255]);
            
            try {
                this.doc.addImage(
                    formData.photo,
                    'JPEG',
                    this.pageWidth - this.margin - photoWidth,
                    this.currentY,
                    photoWidth,
                    photoHeight
                );
                
                // Add photo border
                this.doc.setDrawColor(...this.colors.primary);
                this.doc.setLineWidth(1);
                this.doc.rect(
                    this.pageWidth - this.margin - photoWidth,
                    this.currentY,
                    photoWidth,
                    photoHeight
                );
                
            } catch (error) {
                console.error('Error adding photo to PDF:', error);
                this.doc.setTextColor(...this.colors.error);
                this.doc.text('Photo not available', this.pageWidth - this.margin - photoWidth, this.currentY + 25);
            }
        }
        
        this.currentY += photoHeight + 20;
        
        // Add signature
        if (formData.signature) {
            await this.addSectionHeader('Digital Signature', [255, 255, 255]);
            
            try {
                this.doc.addImage(
                    formData.signature,
                    'PNG',
                    this.margin,
                    this.currentY,
                    signatureWidth,
                    signatureHeight
                );
                
                // Add signature border
                this.doc.setDrawColor(...this.colors.secondary);
                this.doc.setLineWidth(1);
                this.doc.rect(this.margin, this.currentY, signatureWidth, signatureHeight);
                
                // Add signature label
                this.doc.setTextColor(0, 0, 0);
                this.doc.setFontSize(10);
                this.doc.text('Student Signature', this.margin, this.currentY + signatureHeight + 8);
                
            } catch (error) {
                console.error('Error adding signature to PDF:', error);
                this.doc.setTextColor(...this.colors.error);
                this.doc.text('Signature not available', this.margin, this.currentY + 15);
            }
        }
        
        this.currentY += signatureHeight + 20;
    }
    
    async addFooter() {
        const footerY = this.pageHeight - 30;
        const currentDate = new Date().toLocaleString();
        
        // Add footer line
        this.doc.setDrawColor(...this.colors.primary);
        this.doc.setLineWidth(1);
        this.doc.line(this.margin, footerY - 5, this.pageWidth - this.margin, footerY - 5);
        
        // Add generation info
        this.doc.setTextColor(...this.colors.secondary);
        this.doc.setFontSize(9);
        this.doc.text(`Generated on: ${currentDate}`, this.margin, footerY);
        this.doc.text('Navadaya Girls Hostal Management System', this.pageWidth - this.margin, footerY, { align: 'right' });
        
        // Add QR code placeholder
        try {
            const qrSize = 20;
            const qrData = `Student: ${this.doc.formData?.fullName || 'Unknown'}`;
            
            // Generate QR code (placeholder)
            this.doc.setFillColor(200, 200, 200);
            this.doc.rect(this.pageWidth/2 - qrSize/2, footerY - qrSize - 5, qrSize, qrSize, 'F');
            
            this.doc.setTextColor(0, 0, 0);
            this.doc.setFontSize(8);
            this.doc.text('QR Code', this.pageWidth/2, footerY - qrSize/2, { align: 'center' });
            
        } catch (error) {
            console.error('Error adding QR code:', error);
        }
        
        // Add page number
        this.doc.setFontSize(9);
        this.doc.text(`Page ${this.doc.internal.getNumberOfPages()}`, this.pageWidth/2, this.pageHeight - 10, { align: 'center' });
    }
    
    async addSectionHeader(title, backgroundColor) {
        const headerHeight = 12;
        
        // Check if we need a new page
        if (this.currentY > this.pageHeight - 50) {
            this.doc.addPage();
            this.currentY = this.margin;
        }
        
        // Add background
        this.doc.setFillColor(...backgroundColor);
        this.doc.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, headerHeight, 'F');
        
        // Add border
        this.doc.setDrawColor(...this.colors.primary);
        this.doc.setLineWidth(0.5);
        this.doc.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, headerHeight);
        
        // Add title text
        this.doc.setTextColor(0, 0, 0);
        this.doc.setFontSize(14);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text(title, this.margin + 5, this.currentY + 8);
        
        this.currentY += headerHeight + 5;
    }
    
    async addTable(data, backgroundColor) {
        const rowHeight = 8;
        const colWidth = (this.pageWidth - 2 * this.margin) / 2;
        
        data.forEach((row, index) => {
            const y = this.currentY + index * rowHeight;
            
            // Check if we need a new page
            if (y > this.pageHeight - 40) {
                this.doc.addPage();
                this.currentY = this.margin;
                return;
            }
            
            // Add row background (alternating)
            if (index % 2 === 0) {
                this.doc.setFillColor(250, 250, 250);
                this.doc.rect(this.margin, y, this.pageWidth - 2 * this.margin, rowHeight, 'F');
            }
            
            // Add cell borders
            this.doc.setDrawColor(200, 200, 200);
            this.doc.setLineWidth(0.2);
            this.doc.rect(this.margin, y, colWidth, rowHeight);
            this.doc.rect(this.margin + colWidth, y, colWidth, rowHeight);
            
            // Add text
            this.doc.setTextColor(0, 0, 0);
            this.doc.setFontSize(10);
            this.doc.setFont('helvetica', 'bold');
            this.doc.text(row[0], this.margin + 3, y + 5);
            
            this.doc.setFont('helvetica', 'normal');
            this.doc.text(String(row[1]), this.margin + colWidth + 3, y + 5);
        });
        
        this.currentY += data.length * rowHeight;
    }
    
    // Utility methods
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
    
    // Image utilities
    async compressImageForPDF(dataUrl, maxWidth = 200, quality = 0.8) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Calculate new dimensions
                const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
                canvas.width = img.width * ratio;
                canvas.height = img.height * ratio;
                
                // Draw and compress
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                
                resolve(compressedDataUrl);
            };
            img.src = dataUrl;
        });
    }
    
    // PDF optimization
    optimizePDFSize() {
        // This would contain PDF optimization logic
        // For now, we rely on jsPDF's built-in optimization
    }
    
    // Export methods
    downloadPDF(filename = 'navadaya-girls-hostal-admission-form.pdf') {
        if (this.doc) {
            this.doc.save(filename);
        }
    }
    
    getPDFDataURL() {
        if (this.doc) {
            return this.doc.output('dataurlstring');
        }
        return null;
    }
    
    getPDFBlob() {
        if (this.doc) {
            return this.doc.output('blob');
        }
        return null;
    }
}

// Export for use in other modules
window.PDFGenerator = PDFGenerator;
