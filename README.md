# Navadaya Girls Hostal - Advanced Admission Management System

A comprehensive hostel admission management system with enterprise-level admin panel, advanced PDF generation, live photo capture, digital signatures, secure Telegram integration, and Notion database connectivity for seamless application processing.

## Demo = https://na-szqw.onrender.com

## 🚀 Replit link  = https://replit.com/@doloyil618/HostelEnroll

## 🚀 Key Features

### Student Application System
- **Multi-step Form Interface**: Progressive 7-step form with real-time validation
- **Live Camera Integration**: WebRTC-based photo capture with environment/user camera switching
- **Digital Signature Collection**: HTML5 Canvas with SignaturePad library
- **PDF Generation**: Client-side PDF creation with embedded photos and signatures
- **Draft Management**: Auto-save functionality with local storage and version tracking
- **Theme Support**: Light/Dark theme switching with smooth transitions

### Advanced Admin Panel
- **Complete CRUD Operations**: Create, Read, Update, Delete functionality for all applications
- **Enterprise Dashboard**: Real-time statistics with Chart.js integration
- **Advanced Search System**: Multi-field search (name, room number, phone, email) with result counting
- **Bulk Operations**: Multi-selection, bulk status updates, and mass delete capabilities
- **Export Functionality**: CSV/JSON export with filtering options
- **Modal System**: Detailed application viewing/editing with form validation
- **Auto-refresh**: Background data updates every 30 seconds
- **Notification System**: Toast notifications for user feedback

### Security & Integration
- **Secure Environment Variables**: All sensitive credentials stored securely
- **Telegram Bot Integration**: Automated notifications and document submission
- **Notion Database**: Cloud-based application storage and management
- **API Security**: Proper validation and error handling across all endpoints
- **Frontend Security**: No client-side exposure of sensitive tokens

## 🛠 Technology Stack

### Backend
- **Python Flask**: RESTful API with CORS support
- **ReportLab**: Professional PDF generation with custom layouts
- **Notion API**: Cloud database integration
- **Requests**: HTTP client for external API calls
- **PIL (Pillow)**: Image processing and manipulation

### Frontend
- **Vanilla JavaScript**: ES6 classes with modular architecture
- **HTML5 Canvas**: Photo capture and signature handling
- **CSS Grid/Flexbox**: Modern responsive layout system
- **Progressive Web App**: Mobile-first design principles
- **Local Storage**: Client-side data persistence

### External Services
- **Telegram Bot API**: Automated notifications and file sharing
- **Notion Database**: Cloud-based application management
- **WebRTC MediaDevices**: Camera access for photo capture
- **CDN Services**: External library hosting

## ⚙️ Environment Variables

Configure these environment variables for full functionality:

```bash
# Required - Telegram Integration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_from_botfather
TELEGRAM_CHAT_ID=your_telegram_chat_or_group_id

# Optional - Notion Database Integration  
NOTION_INTEGRATION_SECRET=your_notion_integration_token
NOTION_DATABASE_ID=your_notion_database_id
```

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Modern web browser with camera support
- Telegram bot (optional, for notifications)
- Notion workspace (optional, for database)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd navadaya-girls-hostal
   ```

2. **Install Python dependencies**
   ```bash
   pip install flask flask-cors requests reportlab pillow notion-client
   ```

3. **Configure environment variables**
   ```bash
   # Create .env file or set environment variables
   export TELEGRAM_BOT_TOKEN="your_bot_token"
   export TELEGRAM_CHAT_ID="your_chat_id"
   ```

4. **Run the application**
   ```bash
   python app.py
   ```

5. **Access the application**
   - Main Form: `http://localhost:5000`
   - Admin Panel: `http://localhost:5000/admin`

## 📱 Usage Guide

### For Students
1. Navigate to the main application
2. Complete the 7-step admission form
3. Capture photo using device camera
4. Provide digital signature
5. Review and submit application
6. Receive confirmation and PDF document

### For Administrators
1. Access admin panel at `/admin`
2. View dashboard with real-time statistics
3. Search applications using multiple criteria
4. Edit/update application details as needed
5. Perform bulk operations on multiple applications
6. Export data in CSV/JSON formats
7. Monitor application status and manage workflow

## 📁 Project Structure

```
├── 📄 app.py                    # Main Flask backend application
├── 🌐 index.html               # Student admission form interface
├── 👤 admin.html               # Admin panel dashboard
├── 📂 css/                     # Stylesheets and design
│   ├── 🎨 styles.css           # Main application styles
│   ├── 👤 admin.css            # Admin panel styles
│   └── ✨ animations.css       # CSS animations and transitions
├── 📂 js/                      # JavaScript modules
│   ├── 🏠 app.js               # Main application controller
│   ├── 👤 admin.js             # Admin panel functionality
│   ├── 📷 camera.js            # Camera and photo capture
│   ├── ✍️ signature.js         # Digital signature handling
│   ├── 📄 pdf-generator.js     # Client-side PDF creation
│   ├── 📱 telegram.js          # Telegram bot integration
│   ├── ✅ validation.js        # Form validation logic
│   └── 💾 storage.js           # Local storage management
├── 📂 assets/                  # Static assets
│   └── 🏢 logo.svg             # Application branding
├── 📝 replit.md                # Project documentation
└── 📋 README.md                # This file
```

## 🔧 API Endpoints

### Public Endpoints
- `GET /` - Main application interface
- `GET /admin` - Admin panel interface
- `POST /submit-application` - Submit new application

### Admin API Endpoints
- `GET /api/admin/applications` - List all applications
- `GET /api/admin/applications/{id}` - Get specific application
- `PUT /api/admin/applications/{id}` - Update application
- `DELETE /api/admin/applications/{id}` - Delete application
- `POST /api/admin/bulk-update` - Bulk update operations
- `GET /api/admin/stats` - Dashboard statistics
- `POST /api/admin/export` - Export applications

## 🔒 Security Features

- **Environment Variable Protection**: No hardcoded credentials
- **Server-side Token Handling**: Frontend never accesses sensitive tokens
- **Input Validation**: Comprehensive data sanitization
- **Error Handling**: Secure error messages without information leakage
- **CORS Configuration**: Proper cross-origin request handling

## 🚀 Recent Updates (August 2025)

### Security Enhancements
- Migrated all Telegram credentials to secure environment variables
- Removed hardcoded tokens from client-side code
- Implemented proper backend credential validation

### Admin Panel Features
- Complete UI/UX redesign with modern design system
- Advanced multi-field search functionality
- Bulk operations and export capabilities
- Real-time data updates and notifications
- Enhanced error handling and user feedback

### Technical Improvements
- Modular JavaScript architecture with ES6 classes
- CSS Grid-based responsive design
- Performance optimizations and debounced operations
- Accessibility improvements

## 🌐 Deployment on Render

### Step-by-Step Render Deployment

1. **Prepare for deployment**
   ```bash
   # Copy the Render-specific requirements file
   cp render-requirements.txt requirements.txt
   ```

2. **Create a new Web Service on Render**
   - Connect your GitHub repository
   - Choose "Python" as the environment

3. **Configure Build & Deploy Settings**
   ```bash
   # Build Command:
   pip install -r requirements.txt

   # Start Command:
   python app.py
   ```

4. **Set Environment Variables in Render Dashboard**
   ```bash
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token_from_botfather
   TELEGRAM_CHAT_ID=your_telegram_chat_or_group_id
   NOTION_INTEGRATION_SECRET=your_notion_integration_token (optional)
   NOTION_DATABASE_ID=your_notion_database_id (optional)
   ```

5. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment to complete
   - Your app will be available at the provided Render URL

### Troubleshooting Render Deployment

If you encounter module import errors:
1. Ensure all dependencies are in `requirements.txt`
2. Check that Python version is compatible (3.8+)
3. Verify environment variables are properly set in Render dashboard

### Alternative: Using pyproject.toml (Modern Python)

If Render supports pyproject.toml, you can use:
```bash
# Build Command:
pip install -e .

# Start Command:
python app.py
```

## 📞 Support

For technical issues or feature requests, please review the project documentation or contact the development team.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
