// Enhanced Admin Panel JavaScript
class AdminPanel {
    constructor() {
        this.currentSection = 'dashboard';
        this.applications = [];
        this.filteredApplications = [];
        this.selectedApplications = new Set();
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.charts = {};
        this.isDarkTheme = localStorage.getItem('adminTheme') === 'dark';
        this.isLoading = false;
        this.sortDirection = 'desc';
        this.sortField = 'submission_date';
        this.searchDebounceTimer = null;
        this.currentEditingApplication = null;
        
        this.init();
    }

    async init() {
        await this.showLoadingScreen();
        await this.loadApplications();
        this.setupEventListeners();
        this.setupTheme();
        this.initializeCharts();
        this.updateDashboard();
        this.hideLoadingScreen();
        
        console.log('Advanced Admin Panel initialized successfully');
    }

    showLoadingScreen() {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, 1500);
        });
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        const adminContainer = document.getElementById('adminContainer');
        
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            adminContainer.style.display = 'flex';
            adminContainer.style.opacity = '0';
            setTimeout(() => {
                adminContainer.style.opacity = '1';
            }, 100);
        }, 500);
    }

    setupEventListeners() {
        // Menu navigation
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', () => {
                this.switchSection(item.dataset.section);
            });
        });

        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Refresh data
        document.getElementById('refreshData').addEventListener('click', () => {
            this.refreshData();
        });

        // Search functionality with debounce
        document.getElementById('applicationSearch').addEventListener('input', (e) => {
            clearTimeout(this.searchDebounceTimer);
            this.searchDebounceTimer = setTimeout(() => {
                this.searchApplications(e.target.value);
            }, 300);
        });

        // Clear search on escape key
        document.getElementById('applicationSearch').addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.target.value = '';
                this.clearSearch();
            }
        });

        // Clear search button
        document.getElementById('clearSearch').addEventListener('click', () => {
            this.clearSearch();
        });

        // Filter functionality
        document.getElementById('statusFilter').addEventListener('change', (e) => {
            this.filterApplications(e.target.value);
        });

        // Sort functionality
        document.getElementById('sortBy').addEventListener('change', (e) => {
            this.sortApplications(e.target.value);
        });

        // Pagination
        document.getElementById('prevPage').addEventListener('click', () => {
            this.changePage(-1);
        });

        document.getElementById('nextPage').addEventListener('click', () => {
            this.changePage(1);
        });

        // Export functionality
        document.getElementById('exportApplications').addEventListener('click', () => {
            this.showExportModal();
        });

        // Select all checkbox
        document.getElementById('selectAll').addEventListener('change', (e) => {
            this.toggleSelectAll(e.target.checked);
        });

        // Bulk actions
        this.setupBulkActions();

        // Settings tabs
        document.querySelectorAll('.settings-menu li').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchSettingsTab(tab.dataset.tab);
            });
        });

        // Database test
        const testConnectionBtn = document.getElementById('testConnection');
        if (testConnectionBtn) {
            testConnectionBtn.addEventListener('click', () => {
                this.testDatabaseConnection();
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Auto-refresh every 30 seconds
        setInterval(() => {
            if (!this.isLoading) {
                this.refreshData(true); // Silent refresh
            }
        }, 30000);
    }

    setupBulkActions() {
        // Create bulk action bar if it doesn't exist
        if (!document.getElementById('bulkActionBar')) {
            const bulkActionBar = document.createElement('div');
            bulkActionBar.id = 'bulkActionBar';
            bulkActionBar.className = 'bulk-action-bar';
            bulkActionBar.style.display = 'none';
            bulkActionBar.innerHTML = `
                <div class="bulk-actions-left">
                    <span id="selectedCount">0 selected</span>
                </div>
                <div class="bulk-actions-right">
                    <button class="btn btn-sm btn-success" id="bulkApprove">
                        <i class="fas fa-check"></i> Approve Selected
                    </button>
                    <button class="btn btn-sm btn-danger" id="bulkReject">
                        <i class="fas fa-times"></i> Reject Selected
                    </button>
                    <button class="btn btn-sm btn-warning" id="bulkPending">
                        <i class="fas fa-clock"></i> Mark Pending
                    </button>
                    <button class="btn btn-sm btn-outline" id="bulkDelete">
                        <i class="fas fa-trash"></i> Delete Selected
                    </button>
                </div>
            `;
            
            const applicationsSection = document.getElementById('applications');
            const tableContainer = applicationsSection.querySelector('.applications-table-container');
            applicationsSection.insertBefore(bulkActionBar, tableContainer);
        }

        // Add event listeners for bulk actions
        document.getElementById('bulkApprove').addEventListener('click', () => {
            this.bulkUpdateStatus('Approved');
        });

        document.getElementById('bulkReject').addEventListener('click', () => {
            this.bulkUpdateStatus('Rejected');
        });

        document.getElementById('bulkPending').addEventListener('click', () => {
            this.bulkUpdateStatus('Pending Review');
        });

        document.getElementById('bulkDelete').addEventListener('click', () => {
            this.bulkDeleteApplications();
        });
    }

    handleKeyboardShortcuts(e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'r':
                    e.preventDefault();
                    this.refreshData();
                    break;
                case 'e':
                    e.preventDefault();
                    this.showExportModal();
                    break;
                case 'f':
                    e.preventDefault();
                    document.getElementById('applicationSearch').focus();
                    break;
                case 'a':
                    if (this.currentSection === 'applications') {
                        e.preventDefault();
                        document.getElementById('selectAll').click();
                    }
                    break;
            }
        }
        
        // ESC to close modals
        if (e.key === 'Escape') {
            this.closeModal();
        }
    }

    async loadApplications() {
        this.isLoading = true;
        this.showLoadingState();
        
        try {
            const response = await fetch('/api/admin/applications');
            const data = await response.json();
            
            if (data.success) {
                this.applications = data.applications;
                this.filteredApplications = [...this.applications];
                this.updateApplicationsTable();
                this.updateApplicationCount();
            } else {
                this.showNotification('Error loading applications: ' + data.error, 'error');
            }
        } catch (error) {
            console.error('Error loading applications:', error);
            this.showNotification('Failed to load applications', 'error');
        } finally {
            this.isLoading = false;
            this.hideLoadingState();
        }
    }

    showLoadingState() {
        const tableBody = document.getElementById('applicationsTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="loading-row">
                        <div class="loading-spinner-small">
                            <div class="spinner-small"></div>
                            <span>Loading applications...</span>
                        </div>
                    </td>
                </tr>
            `;
        }
    }

    hideLoadingState() {
        // Loading state will be replaced by actual data
    }

    switchSection(section) {
        if (this.currentSection === section) return;

        // Remove active class from all menu items
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });

        // Add active class to clicked item
        document.querySelector(`[data-section="${section}"]`).classList.add('active');

        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });

        // Show target section
        document.getElementById(section).classList.add('active');

        // Update header
        const sectionTitles = {
            dashboard: 'Dashboard',
            applications: 'Applications Management',
            students: 'Student Management',
            analytics: 'Analytics & Reports',
            settings: 'System Settings'
        };

        document.getElementById('pageTitle').textContent = sectionTitles[section];
        document.getElementById('currentSection').textContent = sectionTitles[section];

        this.currentSection = section;

        // Load section-specific data
        if (section === 'analytics') {
            this.loadAnalytics();
        } else if (section === 'students') {
            this.loadStudents();
        }
    }

    toggleTheme() {
        this.isDarkTheme = !this.isDarkTheme;
        document.documentElement.setAttribute('data-theme', this.isDarkTheme ? 'dark' : 'light');
        localStorage.setItem('adminTheme', this.isDarkTheme ? 'dark' : 'light');
        
        const themeIcon = document.querySelector('#themeToggle i');
        themeIcon.className = this.isDarkTheme ? 'fas fa-sun' : 'fas fa-moon';
    }

    setupTheme() {
        document.documentElement.setAttribute('data-theme', this.isDarkTheme ? 'dark' : 'light');
        const themeIcon = document.querySelector('#themeToggle i');
        themeIcon.className = this.isDarkTheme ? 'fas fa-sun' : 'fas fa-moon';
    }

    async refreshData(silent = false) {
        if (!silent) {
            this.showNotification('Refreshing data...', 'info');
        }
        
        await Promise.all([
            this.loadApplications(),
            this.updateDashboard()
        ]);
        
        if (!silent) {
            this.showNotification('Data refreshed successfully', 'success');
        }
    }

    searchApplications(query) {
        if (!query.trim()) {
            this.filteredApplications = [...this.applications];
        } else {
            const searchTerm = query.toLowerCase();
            this.filteredApplications = this.applications.filter(app => {
                // Search by student name
                const studentName = (app.student_name || '').toLowerCase();
                
                // Search by room number
                const roomNumber = (app.room_number || '').toLowerCase();
                
                // Search by phone numbers (student phone, guardian phone, emergency contact)
                const studentPhone = (app.phone || '').replace(/\D/g, ''); // Remove non-digits
                const guardianPhone = (app.guardian_phone || '').replace(/\D/g, '');
                const emergencyContact = (app.emergency_contact || '').replace(/\D/g, '');
                const searchPhone = query.replace(/\D/g, ''); // Remove non-digits from search
                
                // Search by email
                const email = (app.email || '').toLowerCase();
                
                // Search by application ID
                const applicationId = (app.application_id || '').toLowerCase();
                
                // Search by guardian name
                const guardianName = (app.guardian_name || '').toLowerCase();
                
                // Search by status
                const status = (app.status || '').toLowerCase();
                
                return (
                    studentName.includes(searchTerm) ||
                    roomNumber.includes(searchTerm) ||
                    email.includes(searchTerm) ||
                    applicationId.includes(searchTerm) ||
                    guardianName.includes(searchTerm) ||
                    status.includes(searchTerm) ||
                    (searchPhone && (
                        studentPhone.includes(searchPhone) ||
                        guardianPhone.includes(searchPhone) ||
                        emergencyContact.includes(searchPhone)
                    ))
                );
            });
        }
        
        this.currentPage = 1;
        this.updateApplicationsTable();
        this.showSearchResults(query);
    }
    
    showSearchResults(query) {
        const searchResults = document.getElementById('searchResults');
        const searchResultsText = document.getElementById('searchResultsText');
        const clearButton = document.getElementById('clearSearch');
        
        if (query.trim()) {
            const resultCount = this.filteredApplications.length;
            searchResults.style.display = 'block';
            searchResultsText.textContent = `Found ${resultCount} result${resultCount !== 1 ? 's' : ''} for "${query}"`;
            clearButton.style.display = 'flex';
        } else {
            searchResults.style.display = 'none';
            clearButton.style.display = 'none';
        }
    }

    clearSearch() {
        document.getElementById('applicationSearch').value = '';
        this.searchApplications('');
        document.getElementById('applicationSearch').focus();
    }

    filterApplications(status) {
        if (!status) {
            this.filteredApplications = [...this.applications];
        } else {
            this.filteredApplications = this.applications.filter(app => app.status === status);
        }
        
        this.currentPage = 1;
        this.updateApplicationsTable();
    }

    sortApplications(field) {
        this.sortField = field;
        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        
        this.filteredApplications.sort((a, b) => {
            let aVal = a[field] || '';
            let bVal = b[field] || '';
            
            if (field === 'submission_date' || field === 'admission_date') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            }
            
            if (this.sortDirection === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });
        
        this.updateApplicationsTable();
    }

    updateApplicationsTable() {
        const tableBody = document.getElementById('applicationsTableBody');
        if (!tableBody) return;

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageData = this.filteredApplications.slice(startIndex, endIndex);

        if (pageData.length === 0) {
            const isSearching = document.getElementById('applicationSearch').value.trim();
            const emptyMessage = isSearching ? 
                `No applications found matching "${document.getElementById('applicationSearch').value}"` : 
                'No applications found';
            const emptyIcon = isSearching ? 'fas fa-search' : 'fas fa-inbox';
            
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="no-data">
                        <div class="empty-state">
                            <i class="${emptyIcon}"></i>
                            <p>${emptyMessage}</p>
                            ${isSearching ? '<p class="search-help">Try searching by: Student name, Room number, Phone number, Email, or Application ID</p>' : ''}
                        </div>
                    </td>
                </tr>
            `;
        } else {
            tableBody.innerHTML = pageData.map(app => `
                <tr data-id="${app.id}" class="application-row ${this.selectedApplications.has(app.id) ? 'selected' : ''}">
                    <td>
                        <input type="checkbox" class="application-checkbox" 
                               value="${app.id}" 
                               ${this.selectedApplications.has(app.id) ? 'checked' : ''}>
                    </td>
                    <td class="student-info">
                        <div class="student-name">${app.student_name || 'N/A'}</div>
                        <div class="student-id">${app.application_id || 'N/A'}</div>
                    </td>
                    <td class="contact-info">
                        <div class="email">${app.email || 'N/A'}</div>
                    </td>
                    <td class="phone-info">${app.phone || 'N/A'}</td>
                    <td class="room-info">${app.room_number || 'Not Assigned'}</td>
                    <td>
                        <span class="status-badge status-${app.status ? app.status.toLowerCase().replace(' ', '-') : 'pending-review'}">
                            ${app.status || 'Pending Review'}
                        </span>
                    </td>
                    <td class="date-info">${this.formatDate(app.submission_date)}</td>
                    <td class="actions">
                        <div class="action-buttons">
                            <button class="btn-icon btn-view" title="View Details" onclick="adminPanel.viewApplication('${app.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-icon btn-edit" title="Edit Application" onclick="adminPanel.editApplication('${app.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <div class="dropdown">
                                <button class="btn-icon btn-more" title="More Actions">
                                    <i class="fas fa-ellipsis-v"></i>
                                </button>
                                <div class="dropdown-menu">
                                    <button onclick="adminPanel.updateApplicationStatus('${app.id}', 'Approved')">
                                        <i class="fas fa-check"></i> Approve
                                    </button>
                                    <button onclick="adminPanel.updateApplicationStatus('${app.id}', 'Rejected')">
                                        <i class="fas fa-times"></i> Reject
                                    </button>
                                    <button onclick="adminPanel.updateApplicationStatus('${app.id}', 'Pending Review')">
                                        <i class="fas fa-clock"></i> Mark Pending
                                    </button>
                                    <div class="dropdown-divider"></div>
                                    <button onclick="adminPanel.deleteApplication('${app.id}')" class="danger">
                                        <i class="fas fa-trash"></i> Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        // Update pagination
        this.updatePagination();

        // Add event listeners for checkboxes
        document.querySelectorAll('.application-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const appId = e.target.value;
                if (e.target.checked) {
                    this.selectedApplications.add(appId);
                } else {
                    this.selectedApplications.delete(appId);
                }
                this.updateBulkActionBar();
                this.updateRowSelection();
            });
        });

        // Setup dropdown menus
        this.setupDropdowns();
    }

    setupDropdowns() {
        document.querySelectorAll('.dropdown').forEach(dropdown => {
            const button = dropdown.querySelector('.btn-more');
            const menu = dropdown.querySelector('.dropdown-menu');

            button.addEventListener('click', (e) => {
                e.stopPropagation();
                // Close other dropdowns
                document.querySelectorAll('.dropdown-menu').forEach(m => {
                    if (m !== menu) m.style.display = 'none';
                });
                // Toggle current dropdown
                menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
            });
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', () => {
            document.querySelectorAll('.dropdown-menu').forEach(menu => {
                menu.style.display = 'none';
            });
        });
    }

    updateBulkActionBar() {
        const bulkActionBar = document.getElementById('bulkActionBar');
        const selectedCount = document.getElementById('selectedCount');
        
        if (this.selectedApplications.size > 0) {
            bulkActionBar.style.display = 'flex';
            selectedCount.textContent = `${this.selectedApplications.size} selected`;
        } else {
            bulkActionBar.style.display = 'none';
        }
    }

    updateRowSelection() {
        document.querySelectorAll('.application-row').forEach(row => {
            const appId = row.dataset.id;
            if (this.selectedApplications.has(appId)) {
                row.classList.add('selected');
            } else {
                row.classList.remove('selected');
            }
        });
    }

    toggleSelectAll(checked) {
        const pageData = this.filteredApplications.slice(
            (this.currentPage - 1) * this.itemsPerPage,
            this.currentPage * this.itemsPerPage
        );

        pageData.forEach(app => {
            if (checked) {
                this.selectedApplications.add(app.id);
            } else {
                this.selectedApplications.delete(app.id);
            }
        });

        document.querySelectorAll('.application-checkbox').forEach(checkbox => {
            checkbox.checked = checked;
        });

        this.updateBulkActionBar();
        this.updateRowSelection();
    }

    updatePagination() {
        const totalPages = Math.ceil(this.filteredApplications.length / this.itemsPerPage);
        const paginationInfo = document.getElementById('paginationInfo');
        const prevButton = document.getElementById('prevPage');
        const nextButton = document.getElementById('nextPage');

        paginationInfo.textContent = `Page ${this.currentPage} of ${totalPages}`;
        
        prevButton.disabled = this.currentPage <= 1;
        nextButton.disabled = this.currentPage >= totalPages;
        
        prevButton.classList.toggle('disabled', this.currentPage <= 1);
        nextButton.classList.toggle('disabled', this.currentPage >= totalPages);
    }

    changePage(direction) {
        const totalPages = Math.ceil(this.filteredApplications.length / this.itemsPerPage);
        const newPage = this.currentPage + direction;
        
        if (newPage >= 1 && newPage <= totalPages) {
            this.currentPage = newPage;
            this.updateApplicationsTable();
        }
    }

    updateApplicationCount() {
        const badge = document.getElementById('applicationCount');
        if (badge) {
            badge.textContent = this.applications.length;
        }
    }

    async updateDashboard() {
        try {
            const response = await fetch('/api/admin/stats');
            const data = await response.json();
            
            if (data.success) {
                const stats = data.stats;
                
                document.getElementById('totalApplications').textContent = stats.total;
                document.getElementById('approvedApplications').textContent = stats.approved;
                document.getElementById('pendingApplications').textContent = stats.pending;
                document.getElementById('rejectedApplications').textContent = stats.rejected;
                
                this.updateRecentApplications();
                this.updateStatusChart(stats);
            }
        } catch (error) {
            console.error('Error updating dashboard:', error);
        }
    }

    updateRecentApplications() {
        const recentList = document.getElementById('recentApplicationsList');
        if (!recentList) return;

        const recentApps = this.applications
            .sort((a, b) => new Date(b.submission_date) - new Date(a.submission_date))
            .slice(0, 5);

        if (recentApps.length === 0) {
            recentList.innerHTML = '<div class="no-data">No recent applications</div>';
        } else {
            recentList.innerHTML = recentApps.map(app => `
                <div class="recent-application" onclick="adminPanel.viewApplication('${app.id}')">
                    <div class="app-info">
                        <div class="app-name">${app.student_name || 'N/A'}</div>
                        <div class="app-date">${this.formatDate(app.submission_date)}</div>
                    </div>
                    <span class="status-badge status-${app.status ? app.status.toLowerCase().replace(' ', '-') : 'pending-review'}">
                        ${app.status || 'Pending'}
                    </span>
                </div>
            `).join('');
        }
    }

    initializeCharts() {
        // Initialize status chart if Chart.js is available
        if (typeof Chart !== 'undefined') {
            const ctx = document.getElementById('statusChart');
            if (ctx) {
                this.charts.statusChart = new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Approved', 'Pending', 'Rejected'],
                        datasets: [{
                            data: [0, 0, 0],
                            backgroundColor: ['#059669', '#d97706', '#dc2626'],
                            borderWidth: 2,
                            borderColor: '#ffffff'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom'
                            }
                        }
                    }
                });
            }
        }
    }

    updateStatusChart(stats) {
        if (this.charts.statusChart) {
            this.charts.statusChart.data.datasets[0].data = [
                stats.approved,
                stats.pending,
                stats.rejected
            ];
            this.charts.statusChart.update();
        }
    }

    async viewApplication(applicationId) {
        try {
            const response = await fetch(`/api/admin/applications/${applicationId}`);
            const data = await response.json();
            
            if (data.success) {
                this.showApplicationModal(data.application, 'view');
            } else {
                this.showNotification('Error loading application details', 'error');
            }
        } catch (error) {
            console.error('Error viewing application:', error);
            this.showNotification('Failed to load application details', 'error');
        }
    }

    async editApplication(applicationId) {
        try {
            const response = await fetch(`/api/admin/applications/${applicationId}`);
            const data = await response.json();
            
            if (data.success) {
                this.currentEditingApplication = data.application;
                this.showApplicationModal(data.application, 'edit');
            } else {
                this.showNotification('Error loading application for editing', 'error');
            }
        } catch (error) {
            console.error('Error loading application for editing:', error);
            this.showNotification('Failed to load application for editing', 'error');
        }
    }

    showApplicationModal(application, mode = 'view') {
        // Create modal if it doesn't exist
        let modal = document.getElementById('applicationModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'applicationModal';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }

        const isEditing = mode === 'edit';
        
        modal.innerHTML = `
            <div class="modal-content application-modal">
                <div class="modal-header">
                    <h2>${isEditing ? 'Edit Application' : 'Application Details'}</h2>
                    <button class="modal-close" onclick="adminPanel.closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="applicationForm" class="application-form">
                        <div class="form-grid">
                            <div class="form-section">
                                <h3>Student Information</h3>
                                <div class="form-group">
                                    <label>Student Name</label>
                                    <input type="text" name="student_name" value="${application.student_name || ''}" ${isEditing ? '' : 'readonly'}>
                                </div>
                                <div class="form-group">
                                    <label>Email</label>
                                    <input type="email" name="email" value="${application.email || ''}" ${isEditing ? '' : 'readonly'}>
                                </div>
                                <div class="form-group">
                                    <label>Phone</label>
                                    <input type="tel" name="phone" value="${application.phone || ''}" ${isEditing ? '' : 'readonly'}>
                                </div>
                                <div class="form-group">
                                    <label>Date of Birth</label>
                                    <input type="date" name="date_of_birth" value="${application.date_of_birth || ''}" ${isEditing ? '' : 'readonly'}>
                                </div>
                                <div class="form-group">
                                    <label>Address</label>
                                    <textarea name="address" ${isEditing ? '' : 'readonly'}>${application.address || ''}</textarea>
                                </div>
                            </div>
                            
                            <div class="form-section">
                                <h3>Guardian Information</h3>
                                <div class="form-group">
                                    <label>Guardian Name</label>
                                    <input type="text" name="guardian_name" value="${application.guardian_name || ''}" ${isEditing ? '' : 'readonly'}>
                                </div>
                                <div class="form-group">
                                    <label>Guardian Phone</label>
                                    <input type="tel" name="guardian_phone" value="${application.guardian_phone || ''}" ${isEditing ? '' : 'readonly'}>
                                </div>
                                <div class="form-group">
                                    <label>Relation</label>
                                    <select name="relation" ${isEditing ? '' : 'disabled'}>
                                        <option value="">Select Relation</option>
                                        <option value="Father" ${application.relation === 'Father' ? 'selected' : ''}>Father</option>
                                        <option value="Mother" ${application.relation === 'Mother' ? 'selected' : ''}>Mother</option>
                                        <option value="Guardian" ${application.relation === 'Guardian' ? 'selected' : ''}>Guardian</option>
                                        <option value="Other" ${application.relation === 'Other' ? 'selected' : ''}>Other</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Emergency Contact</label>
                                    <input type="tel" name="emergency_contact" value="${application.emergency_contact || ''}" ${isEditing ? '' : 'readonly'}>
                                </div>
                            </div>
                            
                            <div class="form-section">
                                <h3>Hostel Information</h3>
                                <div class="form-group">
                                    <label>Room Number</label>
                                    <input type="text" name="room_number" value="${application.room_number || ''}" ${isEditing ? '' : 'readonly'}>
                                </div>
                                <div class="form-group">
                                    <label>Admission Date</label>
                                    <input type="date" name="admission_date" value="${application.admission_date || ''}" ${isEditing ? '' : 'readonly'}>
                                </div>
                                <div class="form-group">
                                    <label>Stay Duration</label>
                                    <input type="text" name="stay_duration" value="${application.stay_duration || ''}" ${isEditing ? '' : 'readonly'}>
                                </div>
                                <div class="form-group">
                                    <label>Status</label>
                                    <select name="status" ${isEditing ? '' : 'disabled'}>
                                        <option value="Pending Review" ${application.status === 'Pending Review' ? 'selected' : ''}>Pending Review</option>
                                        <option value="Approved" ${application.status === 'Approved' ? 'selected' : ''}>Approved</option>
                                        <option value="Rejected" ${application.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="form-section">
                                <h3>System Information</h3>
                                <div class="form-group">
                                    <label>Application ID</label>
                                    <input type="text" name="application_id" value="${application.application_id || ''}" readonly>
                                </div>
                                <div class="form-group">
                                    <label>Submission Date</label>
                                    <input type="text" value="${this.formatDate(application.submission_date)}" readonly>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    ${isEditing ? `
                        <button class="btn btn-primary" onclick="adminPanel.saveApplication()">
                            <i class="fas fa-save"></i> Save Changes
                        </button>
                        <button class="btn btn-outline" onclick="adminPanel.closeModal()">Cancel</button>
                    ` : `
                        <button class="btn btn-primary" onclick="adminPanel.editApplication('${application.id}')">
                            <i class="fas fa-edit"></i> Edit Application
                        </button>
                        <button class="btn btn-outline" onclick="adminPanel.closeModal()">Close</button>
                    `}
                </div>
            </div>
        `;

        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    async saveApplication() {
        if (!this.currentEditingApplication) return;

        const form = document.getElementById('applicationForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        try {
            const response = await fetch(`/api/admin/applications/${this.currentEditingApplication.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Application updated successfully', 'success');
                this.closeModal();
                await this.loadApplications();
            } else {
                this.showNotification('Error updating application: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Error saving application:', error);
            this.showNotification('Failed to save application', 'error');
        }
    }

    closeModal() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.style.display = 'none';
        });
        document.body.style.overflow = '';
        this.currentEditingApplication = null;
    }

    async updateApplicationStatus(applicationId, newStatus) {
        try {
            const response = await fetch(`/api/admin/applications/${applicationId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });

            const result = await response.json();
            
            if (result.success) {
                this.showNotification(`Application ${newStatus.toLowerCase()} successfully`, 'success');
                await this.loadApplications();
                this.updateDashboard();
            } else {
                this.showNotification('Error updating status: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Error updating application status:', error);
            this.showNotification('Failed to update application status', 'error');
        }
    }

    async deleteApplication(applicationId) {
        if (!confirm('Are you sure you want to delete this application? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/api/admin/applications/${applicationId}`, {
                method: 'DELETE'
            });

            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Application deleted successfully', 'success');
                await this.loadApplications();
                this.updateDashboard();
            } else {
                this.showNotification('Error deleting application: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Error deleting application:', error);
            this.showNotification('Failed to delete application', 'error');
        }
    }

    async bulkUpdateStatus(newStatus) {
        if (this.selectedApplications.size === 0) {
            this.showNotification('Please select applications to update', 'warning');
            return;
        }

        const confirmMessage = `Are you sure you want to ${newStatus.toLowerCase()} ${this.selectedApplications.size} application(s)?`;
        if (!confirm(confirmMessage)) {
            return;
        }

        try {
            const response = await fetch('/api/admin/bulk-update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    application_ids: Array.from(this.selectedApplications),
                    status: newStatus
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.showNotification(`${result.updated_count} application(s) updated successfully`, 'success');
                if (result.errors.length > 0) {
                    console.warn('Some updates failed:', result.errors);
                }
                this.selectedApplications.clear();
                this.updateBulkActionBar();
                await this.loadApplications();
                this.updateDashboard();
            } else {
                this.showNotification('Error updating applications: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Error in bulk update:', error);
            this.showNotification('Failed to update applications', 'error');
        }
    }

    async bulkDeleteApplications() {
        if (this.selectedApplications.size === 0) {
            this.showNotification('Please select applications to delete', 'warning');
            return;
        }

        const confirmMessage = `Are you sure you want to delete ${this.selectedApplications.size} application(s)? This action cannot be undone.`;
        if (!confirm(confirmMessage)) {
            return;
        }

        let successCount = 0;
        let errorCount = 0;

        for (const applicationId of this.selectedApplications) {
            try {
                const response = await fetch(`/api/admin/applications/${applicationId}`, {
                    method: 'DELETE'
                });

                const result = await response.json();
                if (result.success) {
                    successCount++;
                } else {
                    errorCount++;
                }
            } catch (error) {
                errorCount++;
            }
        }

        if (successCount > 0) {
            this.showNotification(`${successCount} application(s) deleted successfully`, 'success');
        }
        if (errorCount > 0) {
            this.showNotification(`${errorCount} application(s) could not be deleted`, 'error');
        }

        this.selectedApplications.clear();
        this.updateBulkActionBar();
        await this.loadApplications();
        this.updateDashboard();
    }

    showExportModal() {
        let modal = document.getElementById('exportModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'exportModal';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="modal-content export-modal">
                <div class="modal-header">
                    <h2>Export Applications</h2>
                    <button class="modal-close" onclick="adminPanel.closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="export-options">
                        <div class="form-group">
                            <label>Export Format</label>
                            <select id="exportFormat">
                                <option value="csv">CSV (Excel Compatible)</option>
                                <option value="json">JSON</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Filter by Status</label>
                            <select id="exportStatusFilter">
                                <option value="">All Applications</option>
                                <option value="Pending Review">Pending Review Only</option>
                                <option value="Approved">Approved Only</option>
                                <option value="Rejected">Rejected Only</option>
                            </select>
                        </div>
                        <div class="export-info">
                            <p>Export will include all application details including student information, guardian details, and submission data.</p>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="adminPanel.performExport()">
                        <i class="fas fa-download"></i> Download Export
                    </button>
                    <button class="btn btn-outline" onclick="adminPanel.closeModal()">Cancel</button>
                </div>
            </div>
        `;

        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    async performExport() {
        const format = document.getElementById('exportFormat').value;
        const statusFilter = document.getElementById('exportStatusFilter').value;

        try {
            const response = await fetch('/api/admin/export', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    format: format,
                    status_filter: statusFilter
                })
            });

            const result = await response.json();
            
            if (result.success) {
                // Create and download file
                const blob = new Blob([
                    format === 'csv' ? result.data : JSON.stringify(result.data, null, 2)
                ], {
                    type: result.content_type
                });

                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = result.filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                this.showNotification('Export completed successfully', 'success');
                this.closeModal();
            } else {
                this.showNotification('Export failed: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Error exporting applications:', error);
            this.showNotification('Export failed', 'error');
        }
    }

    async testDatabaseConnection() {
        try {
            const response = await fetch('/api/admin/test-database');
            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Database connection successful', 'success');
            } else {
                this.showNotification('Database connection failed: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Error testing database:', error);
            this.showNotification('Database connection test failed', 'error');
        }
    }

    switchSettingsTab(tab) {
        // Remove active class from all tabs
        document.querySelectorAll('.settings-menu li').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to clicked tab
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        
        // Hide all tab contents
        document.querySelectorAll('.settings-tab').forEach(content => {
            content.classList.remove('active');
        });
        
        // Show target tab content
        document.getElementById(tab).classList.add('active');
    }

    loadAnalytics() {
        // Placeholder for analytics loading
        console.log('Loading analytics...');
    }

    loadStudents() {
        // Placeholder for student management loading
        console.log('Loading students...');
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    showNotification(message, type = 'info') {
        // Create notification container if it doesn't exist
        let container = document.getElementById('notificationContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notificationContainer';
            container.className = 'notification-container';
            document.body.appendChild(container);
        }

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-triangle',
            warning: 'exclamation-circle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }
}

// Initialize admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminPanel = new AdminPanel();
});