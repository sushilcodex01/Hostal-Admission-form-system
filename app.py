from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
import requests
import base64
import io
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from PIL import Image
import json
from datetime import datetime
from notion_client import Client

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

# For Vercel deployment
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Telegram configuration - Use environment variables only for security
import os
TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
TELEGRAM_CHAT_ID = os.getenv('TELEGRAM_CHAT_ID')

# Notion configuration
NOTION_INTEGRATION_SECRET = os.getenv('NOTION_INTEGRATION_SECRET')
NOTION_DATABASE_ID = os.getenv('NOTION_DATABASE_ID')

# Global variable to store the actual database ID once created
ACTUAL_DATABASE_ID = None
DATABASE_ID_FILE = 'notion_database_id.txt'

def load_stored_database_id():
    """Load database ID from file if it exists"""
    global ACTUAL_DATABASE_ID
    try:
        if os.path.exists(DATABASE_ID_FILE):
            with open(DATABASE_ID_FILE, 'r') as f:
                stored_id = f.read().strip()
                if stored_id and notion_client:
                    # Verify the stored ID still works
                    notion_client.databases.retrieve(database_id=stored_id)
                    ACTUAL_DATABASE_ID = stored_id
                    print(f"Loaded existing database ID: {stored_id[:8]}...")
                    return True
    except Exception as e:
        print(f"Failed to load stored database ID: {e}")
        # Remove invalid file
        if os.path.exists(DATABASE_ID_FILE):
            os.remove(DATABASE_ID_FILE)
    return False

def save_database_id(database_id):
    """Save database ID to file"""
    try:
        with open(DATABASE_ID_FILE, 'w') as f:
            f.write(database_id)
        print(f"Saved database ID: {database_id[:8]}...")
    except Exception as e:
        print(f"Failed to save database ID: {e}")

# Initialize Notion client
notion_client = None
if NOTION_INTEGRATION_SECRET:
    try:
        notion_client = Client(auth=NOTION_INTEGRATION_SECRET)
        print("Notion client initialized successfully")
        # Try to load existing database ID
        if load_stored_database_id():
            print("Using existing database")
        else:
            print("No existing database found, will create on first use")
    except Exception as e:
        print(f"Failed to initialize Notion client: {e}")
else:
    print("Notion integration secret not found")

def send_telegram_message(message):
    """Send a text message to Telegram"""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        raise ValueError("Telegram credentials not configured. Please set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID environment variables.")
    
    try:
        url = f'https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage'
        data = {
            'chat_id': TELEGRAM_CHAT_ID,
            'text': message,
            'parse_mode': 'HTML'
        }
        response = requests.post(url, data=data, timeout=30)
        return response.json()
    except Exception as e:
        print(f"Error sending Telegram message: {e}")
        raise

def send_telegram_document(file_data, filename, caption=''):
    """Send a PDF document to Telegram"""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        raise ValueError("Telegram credentials not configured. Please set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID environment variables.")
    
    try:
        url = f'https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendDocument'
        files = {
            'document': (filename, file_data, 'application/pdf')
        }
        data = {
            'chat_id': TELEGRAM_CHAT_ID,
            'caption': caption
        }
        response = requests.post(url, files=files, data=data, timeout=30)
        return response.json()
    except Exception as e:
        print(f"Error sending Telegram document: {e}")
        raise

def create_notion_database():
    """Create a Notion database for hostel admissions"""
    if not notion_client:
        return {'success': False, 'error': 'Notion client not initialized'}
    
    try:
        # Create database properties
        properties = {
            "Student Name": {"title": {}},
            "Application ID": {"rich_text": {}},
            "Email": {"email": {}},
            "Phone": {"phone_number": {}},
            "Date of Birth": {"date": {}},
            "Gender": {
                "select": {
                    "options": [
                        {"name": "Male", "color": "blue"},
                        {"name": "Female", "color": "pink"},
                        {"name": "Other", "color": "gray"}
                    ]
                }
            },
            "Address": {"rich_text": {}},
            "Guardian Name": {"rich_text": {}},
            "Guardian Phone": {"phone_number": {}},
            "Relation": {
                "select": {
                    "options": [
                        {"name": "Father", "color": "blue"},
                        {"name": "Mother", "color": "pink"},
                        {"name": "Guardian", "color": "green"},
                        {"name": "Other", "color": "gray"}
                    ]
                }
            },
            "Room Number": {"rich_text": {}},
            "Admission Date": {"date": {}},
            "Stay Duration": {"rich_text": {}},
            "Emergency Contact": {"phone_number": {}},
            "Status": {
                "select": {
                    "options": [
                        {"name": "Pending Review", "color": "yellow"},
                        {"name": "Approved", "color": "green"},
                        {"name": "Rejected", "color": "red"}
                    ]
                }
            },
            "Submission Date": {"date": {}}
        }
        
        # Create database
        database = notion_client.databases.create(
            parent={"type": "page_id", "page_id": NOTION_DATABASE_ID},
            title=[
                {
                    "type": "text",
                    "text": {
                        "content": "Hostel Admission Applications"
                    }
                }
            ],
            properties=properties
        )
        
        return {
            'success': True,
            'database_id': database['id'],
            'message': 'Database created successfully!'
        }
        
    except Exception as e:
        return {'success': False, 'error': str(e)}

def get_or_create_database():
    """Get existing database ID or create new one if needed"""
    global ACTUAL_DATABASE_ID
    
    # If we already have a working database ID, use it
    if ACTUAL_DATABASE_ID:
        try:
            notion_client.databases.retrieve(database_id=ACTUAL_DATABASE_ID)
            return {'success': True, 'database_id': ACTUAL_DATABASE_ID}
        except:
            # If stored ID doesn't work, reset it
            ACTUAL_DATABASE_ID = None
            if os.path.exists(DATABASE_ID_FILE):
                os.remove(DATABASE_ID_FILE)
    
    # Try to use the provided ID as database first
    try:
        notion_client.databases.retrieve(database_id=NOTION_DATABASE_ID)
        ACTUAL_DATABASE_ID = NOTION_DATABASE_ID
        save_database_id(ACTUAL_DATABASE_ID)
        return {'success': True, 'database_id': NOTION_DATABASE_ID}
    except Exception as db_error:
        # If it's not a database, create one using the page ID
        if "is a page, not a database" in str(db_error):
            print("Creating database in the provided page...")
            create_result = create_notion_database()
            if create_result['success']:
                ACTUAL_DATABASE_ID = create_result['database_id']
                save_database_id(ACTUAL_DATABASE_ID)
                print(f"Database created with ID: {ACTUAL_DATABASE_ID}")
                return {'success': True, 'database_id': ACTUAL_DATABASE_ID}
            else:
                return {'success': False, 'error': f'Failed to create database: {create_result["error"]}'}
        else:
            return {'success': False, 'error': str(db_error)}

def save_to_notion_database(form_data):
    """Save form data to Notion database"""
    if not notion_client or not NOTION_DATABASE_ID:
        return {'success': False, 'error': 'Notion not configured'}
    
    try:
        # Generate application ID
        app_id = f"HA-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Get or create the database
        db_result = get_or_create_database()
        if not db_result['success']:
            return db_result
        
        database_id = db_result['database_id']
        
        # Prepare properties for Notion page
        properties = {
            "Student Name": {
                "title": [
                    {
                        "text": {
                            "content": form_data.get('fullName', 'N/A')
                        }
                    }
                ]
            },
            "Application ID": {
                "rich_text": [
                    {
                        "text": {
                            "content": app_id
                        }
                    }
                ]
            }
        }
        
        # Add other properties safely
        if form_data.get('email'):
            properties["Email"] = {"email": form_data.get('email')}
        
        if form_data.get('phone'):
            properties["Phone"] = {"phone_number": form_data.get('phone')}
        
        if form_data.get('dateOfBirth'):
            properties["Date of Birth"] = {"date": {"start": form_data.get('dateOfBirth')}}
        
        if form_data.get('gender'):
            properties["Gender"] = {"select": {"name": form_data.get('gender').title()}}
        
        if form_data.get('address'):
            properties["Address"] = {"rich_text": [{"text": {"content": form_data.get('address')}}]}
        
        if form_data.get('guardianName'):
            properties["Guardian Name"] = {"rich_text": [{"text": {"content": form_data.get('guardianName')}}]}
        
        if form_data.get('guardianPhone'):
            properties["Guardian Phone"] = {"phone_number": form_data.get('guardianPhone')}
        
        if form_data.get('relation'):
            properties["Relation"] = {"select": {"name": form_data.get('relation').title()}}
        
        if form_data.get('roomNumber'):
            properties["Room Number"] = {"rich_text": [{"text": {"content": form_data.get('roomNumber')}}]}
        
        if form_data.get('admissionDate'):
            properties["Admission Date"] = {"date": {"start": form_data.get('admissionDate')}}
        
        if form_data.get('stayDuration'):
            properties["Stay Duration"] = {"rich_text": [{"text": {"content": form_data.get('stayDuration')}}]}
        
        if form_data.get('emergencyContact'):
            properties["Emergency Contact"] = {"phone_number": form_data.get('emergencyContact')}
        
        # Always add status and submission date
        properties["Status"] = {"select": {"name": "Pending Review"}}
        properties["Submission Date"] = {"date": {"start": datetime.now().isoformat()}}
        
        # Create page in Notion database
        result = notion_client.pages.create(
            parent={"database_id": database_id},
            properties=properties
        )
        
        return {
            'success': True, 
            'notion_page_id': result['id'],
            'application_id': app_id,
            'database_id': database_id
        }
        
    except Exception as e:
        print(f"Error saving to Notion: {e}")
        return {'success': False, 'error': str(e)}

def generate_pdf(form_data):
    """Generate PDF from form data"""
    buffer = io.BytesIO()
    
    # Create PDF
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    
    # Draw header background
    pdf.setFillColorRGB(0.2, 0.3, 0.6)  # Dark blue
    pdf.rect(0, height - 70, width, 70, fill=1)
    
    # Add header text
    pdf.setFillColorRGB(1, 1, 1)  # White text
    pdf.setFont("Helvetica-Bold", 22)
    pdf.drawString(50, height - 30, "NAVADAYA GIRLS HOSTAL")
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(50, height - 50, "Student Admission Form")
    
    # Add application ID and date
    pdf.setFillColorRGB(0, 0, 0)  # Black text
    pdf.setFont("Helvetica", 9)
    current_date = datetime.now().strftime("%B %d, %Y")
    app_id = f"HA-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    pdf.drawString(50, height - 85, f"Application ID: {app_id}")
    pdf.drawString(50, height - 100, f"Generated on: {current_date}")
    
    y_position = height - 120
    
    # Student Details Section
    section_height = 150
    pdf.setFillColorRGB(0.9, 0.9, 1)  # Light blue background
    pdf.rect(30, y_position - section_height, width - 60, section_height, fill=1)
    
    pdf.setFillColorRGB(0, 0, 0)  # Black text
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(40, y_position - 20, "STUDENT DETAILS")
    y_position -= 35
    
    pdf.setFont("Helvetica-Bold", 10)
    student_fields = [
        ("Full Name", form_data.get('fullName', '')),
        ("Date of Birth", form_data.get('dateOfBirth', '')),
        ("Gender", form_data.get('gender', '').title()),
        ("Email Address", form_data.get('email', '')),
        ("Phone Number", form_data.get('phone', '')),
        ("Address", form_data.get('address', ''))
    ]
    
    for field, value in student_fields:
        pdf.drawString(45, y_position, f"{field}:")
        pdf.setFont("Helvetica", 9)
        pdf.drawString(150, y_position, str(value)[:50])  # Limit text length
        pdf.setFont("Helvetica-Bold", 10)
        y_position -= 18
    
    y_position -= 20
    
    # Guardian Details Section
    section_height = 100
    pdf.setFillColorRGB(0.9, 1, 0.9)  # Light green background
    pdf.rect(30, y_position - section_height, width - 60, section_height, fill=1)
    
    pdf.setFillColorRGB(0, 0, 0)  # Black text
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(40, y_position - 20, "GUARDIAN DETAILS")
    y_position -= 35
    
    pdf.setFont("Helvetica-Bold", 10)
    guardian_fields = [
        ("Guardian Name", form_data.get('guardianName', '')),
        ("Relation", form_data.get('relation', '').title()),
        ("Guardian Phone", form_data.get('guardianPhone', '')),
        ("Emergency Contact", form_data.get('emergencyContact', ''))
    ]
    
    for field, value in guardian_fields:
        pdf.drawString(45, y_position, f"{field}:")
        pdf.setFont("Helvetica", 9)
        pdf.drawString(150, y_position, str(value))
        pdf.setFont("Helvetica-Bold", 10)
        y_position -= 18
    
    y_position -= 20
    
    # Hostel Details Section
    section_height = 80
    pdf.setFillColorRGB(1, 0.95, 0.9)  # Light orange background
    pdf.rect(30, y_position - section_height, width - 60, section_height, fill=1)
    
    pdf.setFillColorRGB(0, 0, 0)  # Black text
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(40, y_position - 20, "HOSTAL DETAILS")
    y_position -= 35
    
    pdf.setFont("Helvetica-Bold", 10)
    hostel_fields = [
        ("Room Number", form_data.get('roomNumber', '')),
        ("Admission Date", form_data.get('admissionDate', '')),
        ("Stay Duration", form_data.get('stayDuration', ''))
    ]
    
    for field, value in hostel_fields:
        pdf.drawString(45, y_position, f"{field}:")
        pdf.setFont("Helvetica", 9)
        pdf.drawString(150, y_position, str(value))
        pdf.setFont("Helvetica-Bold", 10)
        y_position -= 18
    
    # Attachments summary on first page
    y_position -= 30
    section_height = 80
    pdf.setFillColorRGB(0.95, 0.95, 0.95)  # Light gray background
    pdf.rect(30, y_position - section_height, width - 60, section_height, fill=1)
    
    pdf.setFillColorRGB(0, 0, 0)  # Black text
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(40, y_position - 20, "ATTACHMENTS")
    
    pdf.setFont("Helvetica", 11)
    pdf.drawString(50, y_position - 40, "The following attachments are included on separate pages:")
    
    attachments_info = []
    if 'studentPhoto' in form_data and form_data['studentPhoto']:
        attachments_info.append("• Student Photo (Page 2)")
    if 'idProof' in form_data and form_data['idProof']:
        attachments_info.append("• ID Proof Document (Page 3)")
    if 'signature' in form_data and form_data['signature']:
        attachments_info.append("• Digital Signature (Page 4)")
    
    if not attachments_info:
        attachments_info = ["• No attachments provided"]
    
    for i, attachment in enumerate(attachments_info):
        pdf.drawString(50, y_position - 55 - (i * 15), attachment)
    
    # Add footer
    footer_y = 80
    pdf.setFillColorRGB(0.9, 0.9, 0.9)  # Light gray background
    pdf.rect(0, 0, width, footer_y, fill=1)
    
    pdf.setFillColorRGB(0, 0, 0)  # Black text
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(50, footer_y - 20, "IMPORTANT NOTES:")
    pdf.setFont("Helvetica", 8)
    pdf.drawString(50, footer_y - 35, "• This is a computer-generated document and does not require manual signature.")
    pdf.drawString(50, footer_y - 50, "• Please keep this document for your records and admission process.")
    
    pdf.setFont("Helvetica-Oblique", 8)
    pdf.drawString(350, footer_y - 20, f"Generated: {datetime.now().strftime('%d/%m/%Y at %H:%M')}")
    pdf.drawString(350, footer_y - 35, "Navadaya Girls Hostal Management System")
    pdf.drawString(350, footer_y - 50, "Contact: admission@university.edu")
    pdf.drawString(350, footer_y - 65, f"App ID: {app_id}")
    
    # PAGE 2: Student Photo (Full Page)
    if 'studentPhoto' in form_data and form_data['studentPhoto']:
        try:
            pdf.showPage()  # Start new page
            
            # Page header
            pdf.setFillColorRGB(0.2, 0.3, 0.6)
            pdf.rect(0, height - 60, width, 60, fill=1)
            pdf.setFillColorRGB(1, 1, 1)
            pdf.setFont("Helvetica-Bold", 20)
            pdf.drawString(50, height - 35, "STUDENT PHOTO")
            
            # Add photo
            photo_data = form_data['studentPhoto'].split(',')[1]
            photo_bytes = base64.b64decode(photo_data)
            photo_img = Image.open(io.BytesIO(photo_bytes))
            
            # Calculate dimensions to fit page while maintaining aspect ratio
            max_width = width - 100
            max_height = height - 200
            
            img_width, img_height = photo_img.size
            scale_x = max_width / img_width
            scale_y = max_height / img_height
            scale = min(scale_x, scale_y)
            
            new_width = int(img_width * scale)
            new_height = int(img_height * scale)
            
            photo_img = photo_img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            photo_buffer = io.BytesIO()
            photo_img.save(photo_buffer, format='PNG')
            photo_buffer.seek(0)
            
            # Center the image
            x_pos = (width - new_width) / 2
            y_pos = (height - new_height) / 2 - 30
            
            pdf.drawImage(ImageReader(photo_buffer), x_pos, y_pos, width=new_width, height=new_height)
            
            # Add caption
            pdf.setFillColorRGB(0, 0, 0)
            pdf.setFont("Helvetica", 12)
            pdf.drawString(50, 50, f"Student Name: {form_data.get('fullName', 'N/A')}")
            pdf.drawString(50, 30, f"Application ID: {app_id}")
            
        except Exception as e:
            print(f"Error adding student photo page: {e}")
    
    # PAGE 3+: ID Proofs (Multiple Pages)
    if 'idProofs' in form_data and form_data['idProofs']:
        try:
            # Process multiple ID proofs with MAXIMUM quality preservation
            id_proofs = form_data['idProofs'] if isinstance(form_data['idProofs'], list) else [form_data['idProofs']]
            
            for proof_index, id_proof_data in enumerate(id_proofs):
                pdf.showPage()  # Start new page for each ID proof
                
                # Enhanced page header with gradient effect
                pdf.setFillColorRGB(0.1, 0.2, 0.5)
                pdf.rect(0, height - 80, width, 80, fill=1)
                
                # Header border
                pdf.setStrokeColorRGB(0.8, 0.8, 0.8)
                pdf.setLineWidth(2)
                pdf.line(0, height - 80, width, height - 80)
                
                # Main title with document number
                pdf.setFillColorRGB(1, 1, 1)
                pdf.setFont("Helvetica-Bold", 24)
                title_text = f"IDENTITY PROOF DOCUMENT {proof_index + 1}"
                title_width = pdf.stringWidth(title_text, "Helvetica-Bold", 24)
                pdf.drawString((width - title_width) / 2, height - 35, title_text)
                
                # Subtitle
                pdf.setFont("Helvetica", 12)
                subtitle_text = "Official Verification Document"
                subtitle_width = pdf.stringWidth(subtitle_text, "Helvetica", 12)
                pdf.drawString((width - subtitle_width) / 2, height - 55, subtitle_text)
                
                # Process current ID proof
                id_data = id_proof_data.split(',')[1]
                id_bytes = base64.b64decode(id_data)
                id_img = Image.open(io.BytesIO(id_bytes))
                
                # Get original format and preserve it
                original_format = id_img.format or 'PNG'
                
                # Calculate available space with generous margins
                margin_x = 40
                margin_y = 100
                max_width = width - (2 * margin_x)
                max_height = height - margin_y - 120
                
                img_width, img_height = id_img.size
                
                # Check if image fits without resizing
                if img_width <= max_width and img_height <= max_height:
                    # Use original image without any resizing
                    new_width = img_width
                    new_height = img_height
                    final_img = id_img  # No processing needed
                else:
                    # Only resize if absolutely necessary
                    scale_x = max_width / img_width
                    scale_y = max_height / img_height
                    scale = min(scale_x, scale_y)
                    
                    new_width = int(img_width * scale)
                    new_height = int(img_height * scale)
                    
                    # Use highest quality resampling
                    final_img = id_img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                
                # Save with MAXIMUM quality settings
                id_buffer = io.BytesIO()
                if original_format.upper() in ['JPEG', 'JPG']:
                    # Highest JPEG quality possible
                    final_img.save(id_buffer, format='JPEG', quality=100, optimize=False, 
                                 subsampling=0, progressive=False)
                else:
                    # Highest PNG quality - no compression
                    final_img.save(id_buffer, format='PNG', optimize=False, compress_level=0)
                id_buffer.seek(0)
                
                # Center the image with better positioning
                x_pos = (width - new_width) / 2
                y_pos = height - margin_y - new_height - 20
                
                # Add image border/frame
                border_width = 3
                pdf.setStrokeColorRGB(0.3, 0.3, 0.3)
                pdf.setLineWidth(border_width)
                pdf.rect(x_pos - border_width, y_pos - border_width, 
                        new_width + (2 * border_width), new_height + (2 * border_width))
                
                # Add the image
                pdf.drawImage(ImageReader(id_buffer), x_pos, y_pos, width=new_width, height=new_height)
                
                # Enhanced information section with better layout
                info_y = y_pos - 40
                
                # Background box for information
                pdf.setFillColorRGB(0.95, 0.95, 0.95)
                pdf.setStrokeColorRGB(0.7, 0.7, 0.7)
                pdf.setLineWidth(1)
                pdf.rect(50, info_y - 60, width - 100, 80, fill=1, stroke=1)
                
                # Information text
                pdf.setFillColorRGB(0, 0, 0)
                pdf.setFont("Helvetica-Bold", 14)
                pdf.drawString(70, info_y - 15, f"DOCUMENT INFORMATION - ID Proof {proof_index + 1}")
                
                pdf.setFont("Helvetica", 11)
                pdf.drawString(70, info_y - 35, f"Student Name: {form_data.get('fullName', 'N/A')}")
                pdf.drawString(70, info_y - 50, f"Application ID: {app_id}")
                
                # Add timestamp and verification info
                current_time = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
                pdf.drawString(width - 250, info_y - 35, f"Verification Date: {current_time}")
                pdf.drawString(width - 250, info_y - 50, f"Image Quality: High Resolution")
                
                # Footer with verification seal
                pdf.setFont("Helvetica-Oblique", 10)
                pdf.setFillColorRGB(0.5, 0.5, 0.5)
                footer_text = "This document is digitally verified and authenticated"
                footer_width = pdf.stringWidth(footer_text, "Helvetica-Oblique", 10)
                pdf.drawString((width - footer_width) / 2, 30, footer_text)
            
        except Exception as e:
            print(f"Error adding ID proof page: {e}")
    
    # PAGE 4: Digital Signature (Full Page)
    if 'signature' in form_data and form_data['signature']:
        try:
            pdf.showPage()  # Start new page
            
            # Page header
            pdf.setFillColorRGB(0.2, 0.3, 0.6)
            pdf.rect(0, height - 60, width, 60, fill=1)
            pdf.setFillColorRGB(1, 1, 1)
            pdf.setFont("Helvetica-Bold", 20)
            pdf.drawString(50, height - 35, "DIGITAL SIGNATURE")
            
            # Add signature
            sig_data = form_data['signature'].split(',')[1]
            sig_bytes = base64.b64decode(sig_data)
            sig_img = Image.open(io.BytesIO(sig_bytes))
            
            # Calculate dimensions to fit page while maintaining aspect ratio
            max_width = width - 200
            max_height = height - 300
            
            img_width, img_height = sig_img.size
            scale_x = max_width / img_width
            scale_y = max_height / img_height
            scale = min(scale_x, scale_y)
            
            new_width = int(img_width * scale)
            new_height = int(img_height * scale)
            
            sig_img = sig_img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            sig_buffer = io.BytesIO()
            sig_img.save(sig_buffer, format='PNG')
            sig_buffer.seek(0)
            
            # Center the image
            x_pos = (width - new_width) / 2
            y_pos = (height - new_height) / 2
            
            pdf.drawImage(ImageReader(sig_buffer), x_pos, y_pos, width=new_width, height=new_height)
            
            # Add signature info
            pdf.setFillColorRGB(0, 0, 0)
            pdf.setFont("Helvetica-Bold", 14)
            pdf.drawString(50, 150, "DECLARATION:")
            pdf.setFont("Helvetica", 12)
            pdf.drawString(50, 130, "I hereby declare that all the information provided above is true and correct to the best of my knowledge.")
            pdf.drawString(50, 110, f"Student Name: {form_data.get('fullName', 'N/A')}")
            pdf.drawString(50, 90, f"Date: {datetime.now().strftime('%d/%m/%Y')}")
            pdf.drawString(50, 70, f"Application ID: {app_id}")
            
        except Exception as e:
            print(f"Error adding signature page: {e}")
    
    pdf.save()
    buffer.seek(0)
    return buffer.getvalue()

@app.route('/submit-application', methods=['POST'])
def submit_application():
    try:
        form_data = request.get_json()
        
        if not form_data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        # Initialize response data
        response_data = {'success': True, 'message': 'Application submitted successfully!'}
        
        # Save to Notion database first
        notion_result = save_to_notion_database(form_data)
        if notion_result['success']:
            response_data['notion_page_id'] = notion_result['notion_page_id']
            response_data['application_id'] = notion_result['application_id']
        else:
            response_data['notion_warning'] = f'Notion save failed: {notion_result["error"]}'
        
        # Generate PDF
        pdf_data = generate_pdf(form_data)
        
        # Create filename
        student_name = form_data.get('fullName', 'Student').replace(' ', '_')
        filename = f"NavadayaGirlsHostal_Application_{student_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        
        # Create caption for Telegram
        app_id = notion_result.get('application_id', f"HA-{datetime.now().strftime('%Y%m%d%H%M%S')}")
        caption = f"""🏠 <b>New Hostel Admission Application</b>
        
👤 <b>Student:</b> {form_data.get('fullName', 'N/A')}
📧 <b>Email:</b> {form_data.get('email', 'N/A')}
📱 <b>Phone:</b> {form_data.get('phone', 'N/A')}
🏠 <b>Room:</b> {form_data.get('roomNumber', 'N/A')}
📅 <b>Admission Date:</b> {form_data.get('admissionDate', 'N/A')}
⏰ <b>Duration:</b> {form_data.get('stayDuration', 'N/A')}
🆔 <b>Application ID:</b> {app_id}

📋 Complete application form attached as PDF."""
        
        # Send to Telegram
        telegram_result = send_telegram_document(pdf_data, filename, caption)
        
        if telegram_result.get('ok'):
            response_data['telegram_message_id'] = telegram_result.get('result', {}).get('message_id')
        else:
            response_data['telegram_warning'] = f'Telegram send failed: {telegram_result.get("description", "Unknown error")}'
        
        # If both Notion and Telegram failed, return error
        if not notion_result['success'] and not telegram_result.get('ok'):
            return jsonify({
                'success': False, 
                'error': 'Failed to submit to both Notion and Telegram',
                'notion_error': notion_result['error'],
                'telegram_error': telegram_result.get('description', 'Unknown error')
            }), 500
        
        return jsonify(response_data)
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/notion-test', methods=['GET'])
def test_notion_connection():
    """Test endpoint to check Notion connection"""
    if not notion_client or not NOTION_DATABASE_ID:
        return jsonify({
            'success': False, 
            'error': 'Notion not configured',
            'has_secret': bool(NOTION_INTEGRATION_SECRET),
            'has_database_id': bool(NOTION_DATABASE_ID)
        })
    
    try:
        # Try to retrieve database info first
        try:
            database = notion_client.databases.retrieve(database_id=NOTION_DATABASE_ID)
            return jsonify({
                'success': True,
                'type': 'database',
                'database_title': database.get('title', [{}])[0].get('text', {}).get('content', 'Unknown'),
                'database_id': NOTION_DATABASE_ID[:8] + '...',
                'message': 'Notion database connection successful!'
            })
        except Exception as db_error:
            # If it's not a database, check if it's a page
            if "is a page, not a database" in str(db_error):
                page = notion_client.pages.retrieve(page_id=NOTION_DATABASE_ID)
                return jsonify({
                    'success': True,
                    'type': 'page',
                    'page_title': page.get('properties', {}).get('title', {}).get('title', [{}])[0].get('text', {}).get('content', 'Unknown'),
                    'page_id': NOTION_DATABASE_ID[:8] + '...',
                    'message': 'Notion page found! Database will be created automatically when first form is submitted.',
                    'note': 'This is a page, not a database. The system will create a database automatically.'
                })
            else:
                raise db_error
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Notion connection failed: {str(e)}'
        })

@app.route('/create-notion-database', methods=['POST'])
def create_database_endpoint():
    """Endpoint to manually create the Notion database"""
    global ACTUAL_DATABASE_ID
    if not notion_client or not NOTION_DATABASE_ID:
        return jsonify({'success': False, 'error': 'Notion not configured'})
    
    # Check if we already have a working database
    if ACTUAL_DATABASE_ID:
        try:
            database = notion_client.databases.retrieve(database_id=ACTUAL_DATABASE_ID)
            return jsonify({
                'success': True,
                'database_id': ACTUAL_DATABASE_ID,
                'message': 'Database already exists!',
                'existing': True
            })
        except:
            ACTUAL_DATABASE_ID = None
    
    result = create_notion_database()
    if result['success']:
        ACTUAL_DATABASE_ID = result['database_id']
        save_database_id(ACTUAL_DATABASE_ID)
    return jsonify(result)

@app.route('/get-database-info', methods=['GET'])
def get_database_info():
    """Get current database information"""
    global ACTUAL_DATABASE_ID
    if not notion_client:
        return jsonify({'success': False, 'error': 'Notion not configured'})
    
    db_result = get_or_create_database()
    if db_result['success']:
        try:
            database = notion_client.databases.retrieve(database_id=db_result['database_id'])
            return jsonify({
                'success': True,
                'database_id': db_result['database_id'][:8] + '...',
                'database_title': database.get('title', [{}])[0].get('text', {}).get('content', 'Unknown'),
                'actual_id_stored': bool(ACTUAL_DATABASE_ID),
                'message': 'Database is ready for submissions!'
            })
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)})
    else:
        return jsonify(db_result)

@app.route('/admin')
def admin_panel():
    """Serve the admin panel"""
    return send_file('admin.html')

@app.route('/api/admin/applications', methods=['GET'])
def get_admin_applications():
    """Get all applications for admin panel"""
    if not notion_client:
        return jsonify({'success': False, 'error': 'Notion not configured'})
    
    try:
        db_result = get_or_create_database()
        if not db_result['success']:
            return jsonify(db_result)
        
        database_id = db_result['database_id']
        
        # Query all pages from database
        response = notion_client.databases.query(
            database_id=database_id,
            sorts=[
                {
                    "property": "Submission Date",
                    "direction": "descending"
                }
            ]
        )
        
        applications = []
        for page in response['results']:
            try:
                props = page['properties']
                
                # Extract data safely
                app_data = {
                    'id': page['id'],
                    'student_name': get_notion_text(props.get('Student Name', {})),
                    'email': get_notion_email(props.get('Email', {})),
                    'phone': get_notion_phone(props.get('Phone', {})),
                    'date_of_birth': get_notion_date(props.get('Date of Birth', {})),
                    'address': get_notion_text(props.get('Address', {})),
                    'guardian_name': get_notion_text(props.get('Guardian Name', {})),
                    'guardian_phone': get_notion_phone(props.get('Guardian Phone', {})),
                    'relation': get_notion_select(props.get('Relation', {})),
                    'room_number': get_notion_text(props.get('Room Number', {})),
                    'admission_date': get_notion_date(props.get('Admission Date', {})),
                    'stay_duration': get_notion_text(props.get('Stay Duration', {})),
                    'emergency_contact': get_notion_phone(props.get('Emergency Contact', {})),
                    'status': get_notion_select(props.get('Status', {})) or 'Pending Review',
                    'submission_date': get_notion_date(props.get('Submission Date', {})),
                    'application_id': get_notion_text(props.get('Application ID', {}))
                }
                applications.append(app_data)
            except Exception as e:
                print(f"Error processing application: {e}")
                continue
        
        return jsonify({
            'success': True,
            'applications': applications,
            'total': len(applications)
        })
        
    except Exception as e:
        print(f"Error fetching applications: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/admin/applications/<application_id>/status', methods=['PATCH'])
def update_application_status(application_id):
    """Update application status"""
    if not notion_client:
        return jsonify({'success': False, 'error': 'Notion not configured'})
    
    try:
        data = request.get_json()
        new_status = data.get('status')
        
        if not new_status:
            return jsonify({'success': False, 'error': 'Status is required'}), 400
        
        # Update the page in Notion
        notion_client.pages.update(
            page_id=application_id,
            properties={
                "Status": {
                    "select": {
                        "name": new_status
                    }
                }
            }
        )
        
        return jsonify({
            'success': True,
            'message': f'Application status updated to {new_status}'
        })
        
    except Exception as e:
        print(f"Error updating application status: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/applications/<application_id>', methods=['DELETE'])
def delete_application(application_id):
    """Delete an application"""
    if not notion_client:
        return jsonify({'success': False, 'error': 'Notion not configured'})
    
    try:
        # Archive the page in Notion (Notion doesn't allow true deletion)
        notion_client.pages.update(
            page_id=application_id,
            archived=True
        )
        
        return jsonify({
            'success': True,
            'message': 'Application deleted successfully'
        })
        
    except Exception as e:
        print(f"Error deleting application: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/test-database', methods=['GET'])
def test_admin_database():
    """Test database connection for admin"""
    if not notion_client:
        return jsonify({'success': False, 'error': 'Notion not configured'})
    
    try:
        db_result = get_or_create_database()
        if db_result['success']:
            database = notion_client.databases.retrieve(database_id=db_result['database_id'])
            return jsonify({
                'success': True,
                'database_id': db_result['database_id'][:8] + '...',
                'database_title': database.get('title', [{}])[0].get('text', {}).get('content', 'Unknown'),
                'message': 'Database connection successful'
            })
        else:
            return jsonify(db_result)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/admin/stats', methods=['GET'])
def get_admin_stats():
    """Get statistics for admin dashboard"""
    if not notion_client:
        return jsonify({'success': False, 'error': 'Notion not configured'})
    
    try:
        db_result = get_or_create_database()
        if not db_result['success']:
            return jsonify(db_result)
        
        database_id = db_result['database_id']
        
        # Get all applications
        response = notion_client.databases.query(database_id=database_id)
        
        total = len(response['results'])
        approved = 0
        pending = 0
        rejected = 0
        
        for page in response['results']:
            status = get_notion_select(page['properties'].get('Status', {})) or 'Pending Review'
            if status == 'Approved':
                approved += 1
            elif status == 'Rejected':
                rejected += 1
            else:
                pending += 1
        
        return jsonify({
            'success': True,
            'stats': {
                'total': total,
                'approved': approved,
                'pending': pending,
                'rejected': rejected
            }
        })
        
    except Exception as e:
        print(f"Error fetching stats: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/admin/applications/<application_id>', methods=['GET'])
def get_single_application(application_id):
    """Get single application details for editing"""
    if not notion_client:
        return jsonify({'success': False, 'error': 'Notion not configured'})
    
    try:
        # Get the specific page
        page = notion_client.pages.retrieve(page_id=application_id)
        props = page['properties']
        
        # Extract data safely
        app_data = {
            'id': page['id'],
            'student_name': get_notion_text(props.get('Student Name', {})),
            'email': get_notion_email(props.get('Email', {})),
            'phone': get_notion_phone(props.get('Phone', {})),
            'date_of_birth': get_notion_date(props.get('Date of Birth', {})),
            'address': get_notion_text(props.get('Address', {})),
            'guardian_name': get_notion_text(props.get('Guardian Name', {})),
            'guardian_phone': get_notion_phone(props.get('Guardian Phone', {})),
            'relation': get_notion_select(props.get('Relation', {})),
            'room_number': get_notion_text(props.get('Room Number', {})),
            'admission_date': get_notion_date(props.get('Admission Date', {})),
            'stay_duration': get_notion_text(props.get('Stay Duration', {})),
            'emergency_contact': get_notion_phone(props.get('Emergency Contact', {})),
            'status': get_notion_select(props.get('Status', {})) or 'Pending Review',
            'submission_date': get_notion_date(props.get('Submission Date', {})),
            'application_id': get_notion_text(props.get('Application ID', {}))
        }
        
        return jsonify({
            'success': True,
            'application': app_data
        })
        
    except Exception as e:
        print(f"Error fetching application: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/admin/applications/<application_id>', methods=['PUT'])
def update_application(application_id):
    """Update application data"""
    if not notion_client:
        return jsonify({'success': False, 'error': 'Notion not configured'})
    
    try:
        data = request.get_json()
        
        # Build properties object for update
        properties = {}
        
        if data.get('student_name'):
            properties['Student Name'] = {'title': [{'text': {'content': data['student_name']}}]}
        
        if data.get('email'):
            properties['Email'] = {'email': data['email']}
        
        if data.get('phone'):
            properties['Phone'] = {'phone_number': data['phone']}
        
        if data.get('date_of_birth'):
            properties['Date of Birth'] = {'date': {'start': data['date_of_birth']}}
        
        if data.get('address'):
            properties['Address'] = {'rich_text': [{'text': {'content': data['address']}}]}
        
        if data.get('guardian_name'):
            properties['Guardian Name'] = {'rich_text': [{'text': {'content': data['guardian_name']}}]}
        
        if data.get('guardian_phone'):
            properties['Guardian Phone'] = {'phone_number': data['guardian_phone']}
        
        if data.get('relation'):
            properties['Relation'] = {'select': {'name': data['relation']}}
        
        if data.get('room_number'):
            properties['Room Number'] = {'rich_text': [{'text': {'content': data['room_number']}}]}
        
        if data.get('admission_date'):
            properties['Admission Date'] = {'date': {'start': data['admission_date']}}
        
        if data.get('stay_duration'):
            properties['Stay Duration'] = {'rich_text': [{'text': {'content': data['stay_duration']}}]}
        
        if data.get('emergency_contact'):
            properties['Emergency Contact'] = {'phone_number': data['emergency_contact']}
        
        if data.get('status'):
            properties['Status'] = {'select': {'name': data['status']}}
        
        # Update the page in Notion
        notion_client.pages.update(
            page_id=application_id,
            properties=properties
        )
        
        return jsonify({
            'success': True,
            'message': 'Application updated successfully'
        })
        
    except Exception as e:
        print(f"Error updating application: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/export', methods=['POST'])
def export_applications():
    """Export applications to CSV"""
    if not notion_client:
        return jsonify({'success': False, 'error': 'Notion not configured'})
    
    try:
        data = request.get_json()
        export_format = data.get('format', 'csv')
        filter_status = data.get('status_filter', '')
        
        db_result = get_or_create_database()
        if not db_result['success']:
            return jsonify(db_result)
        
        database_id = db_result['database_id']
        
        # Query database with optional status filter
        query_filter = None
        if filter_status:
            query_filter = {
                "property": "Status",
                "select": {
                    "equals": filter_status
                }
            }
        
        response = notion_client.databases.query(
            database_id=database_id,
            filter=query_filter,
            sorts=[
                {
                    "property": "Submission Date",
                    "direction": "descending"
                }
            ]
        )
        
        applications = []
        for page in response['results']:
            try:
                props = page['properties']
                
                app_data = {
                    'Application ID': get_notion_text(props.get('Application ID', {})),
                    'Student Name': get_notion_text(props.get('Student Name', {})),
                    'Email': get_notion_email(props.get('Email', {})),
                    'Phone': get_notion_phone(props.get('Phone', {})),
                    'Date of Birth': get_notion_date(props.get('Date of Birth', {})),
                    'Address': get_notion_text(props.get('Address', {})),
                    'Guardian Name': get_notion_text(props.get('Guardian Name', {})),
                    'Guardian Phone': get_notion_phone(props.get('Guardian Phone', {})),
                    'Relation': get_notion_select(props.get('Relation', {})),
                    'Room Number': get_notion_text(props.get('Room Number', {})),
                    'Admission Date': get_notion_date(props.get('Admission Date', {})),
                    'Stay Duration': get_notion_text(props.get('Stay Duration', {})),
                    'Emergency Contact': get_notion_phone(props.get('Emergency Contact', {})),
                    'Status': get_notion_select(props.get('Status', {})) or 'Pending Review',
                    'Submission Date': get_notion_date(props.get('Submission Date', {}))
                }
                applications.append(app_data)
            except Exception as e:
                print(f"Error processing application for export: {e}")
                continue
        
        if export_format == 'csv':
            import csv
            import io
            
            output = io.StringIO()
            if applications:
                writer = csv.DictWriter(output, fieldnames=applications[0].keys())
                writer.writeheader()
                writer.writerows(applications)
            
            response_data = {
                'success': True,
                'data': output.getvalue(),
                'filename': f'applications_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv',
                'content_type': 'text/csv'
            }
        else:  # JSON format
            response_data = {
                'success': True,
                'data': applications,
                'filename': f'applications_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json',
                'content_type': 'application/json'
            }
        
        return jsonify(response_data)
        
    except Exception as e:
        print(f"Error exporting applications: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/bulk-update', methods=['POST'])
def bulk_update_applications():
    """Bulk update application statuses"""
    if not notion_client:
        return jsonify({'success': False, 'error': 'Notion not configured'})
    
    try:
        data = request.get_json()
        application_ids = data.get('application_ids', [])
        new_status = data.get('status')
        
        if not application_ids or not new_status:
            return jsonify({'success': False, 'error': 'Application IDs and status are required'}), 400
        
        updated_count = 0
        errors = []
        
        for app_id in application_ids:
            try:
                notion_client.pages.update(
                    page_id=app_id,
                    properties={
                        "Status": {
                            "select": {
                                "name": new_status
                            }
                        }
                    }
                )
                updated_count += 1
            except Exception as e:
                errors.append(f"Failed to update {app_id}: {str(e)}")
        
        return jsonify({
            'success': True,
            'updated_count': updated_count,
            'total_count': len(application_ids),
            'errors': errors
        })
        
    except Exception as e:
        print(f"Error in bulk update: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

def get_notion_text(prop):
    """Extract text from Notion property"""
    try:
        if prop.get('type') == 'title':
            return prop.get('title', [{}])[0].get('text', {}).get('content', '')
        elif prop.get('type') == 'rich_text':
            return prop.get('rich_text', [{}])[0].get('text', {}).get('content', '')
        return ''
    except (IndexError, KeyError):
        return ''

def get_notion_email(prop):
    """Extract email from Notion property"""
    try:
        return prop.get('email', '')
    except KeyError:
        return ''

def get_notion_phone(prop):
    """Extract phone from Notion property"""
    try:
        return prop.get('phone_number', '')
    except KeyError:
        return ''

def get_notion_date(prop):
    """Extract date from Notion property"""
    try:
        date_obj = prop.get('date', {})
        if date_obj:
            return date_obj.get('start', '')
        return ''
    except KeyError:
        return ''

def get_notion_select(prop):
    """Extract select value from Notion property"""
    try:
        select_obj = prop.get('select', {})
        if select_obj:
            return select_obj.get('name', '')
        return ''
    except KeyError:
        return ''

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'message': 'Python backend is running'})

@app.route('/')
def index():
    return send_file('index.html')

# Entry point for Vercel - app will be imported directly

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)