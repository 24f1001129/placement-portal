from flask import Blueprint, request, jsonify, session, current_app
from functools import wraps
from datetime import datetime
import pytz
import os
from backend.models import User, Company, Student, Drive, Position, Application, Placement, Interview, db
from backend.models.database import format_indian_currency

# reportlab imports
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

def generate_offer_letter_pdf(file_path, student, company, position, joining_date, acceptance_deadline):
    doc = SimpleDocTemplate(file_path, pagesize=letter,
                            rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    story = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor('#1A365D'),
        alignment=1, # Center
        spaceAfter=20
    )
    
    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#2D3748'),
        spaceAfter=10
    )
    
    bold_style = ParagraphStyle(
        'DocBold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )
    
    # Title
    story.append(Paragraph("OFFER OF EMPLOYMENT", title_style))
    story.append(Spacer(1, 15))
    
    # Date & Header Info
    now_str = datetime.now(pytz.timezone('Asia/Kolkata')).strftime('%d/%m/%Y')
    story.append(Paragraph(f"<b>Date:</b> {now_str}", body_style))
    story.append(Spacer(1, 10))
    
    # Addressee
    story.append(Paragraph("<b>To,</b>", body_style))
    story.append(Paragraph(f"<b>Name:</b> {student.full_name}", body_style))
    story.append(Paragraph(f"<b>Email:</b> {student.user.email}", body_style))
    story.append(Paragraph(f"<b>Branch:</b> {student.branch}", body_style))
    story.append(Spacer(1, 15))
    
    # Salutation
    story.append(Paragraph(f"Dear {student.full_name},", body_style))
    story.append(Spacer(1, 10))
    
    # Intro
    intro_text = f"We are pleased to offer you the position of <b>{position.position_name}</b> at <b>{company.company_name}</b>. We were impressed by your profile and credentials, and we believe you will be a valuable addition to our team."
    story.append(Paragraph(intro_text, body_style))
    story.append(Spacer(1, 15))
    
    # Table of Offer details
    formatted_salary = format_indian_currency(position.salary)
    joining_date_str = joining_date.strftime('%d/%m/%Y')
    deadline_str = acceptance_deadline.strftime('%d/%m/%Y %I:%M %p')
    
    data = [
        [Paragraph("<b>Job Position</b>", body_style), Paragraph(position.position_name, body_style)],
        [Paragraph("<b>Job Mode</b>", body_style), Paragraph(position.mode, body_style)],
        [Paragraph("<b>Job Location</b>", body_style), Paragraph(position.location, body_style)],
        [Paragraph("<b>Annual CTC</b>", body_style), Paragraph(f"INR {formatted_salary}", body_style)],
        [Paragraph("<b>Target Joining Date</b>", body_style), Paragraph(joining_date_str, body_style)],
        [Paragraph("<b>Acceptance Deadline</b>", body_style), Paragraph(deadline_str, body_style)],
    ]
    
    t = Table(data, colWidths=[150, 350])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F7FAFC')),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TEXTCOLOR', (0,0), (-1,-1), colors.HexColor('#2D3748')),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
    ]))
    story.append(t)
    story.append(Spacer(1, 20))
    
    # Closing
    story.append(Paragraph("Please confirm your acceptance of this offer by clicking 'Accept Offer' on your student dashboard before the acceptance deadline mentioned above.", body_style))
    story.append(Spacer(1, 20))
    
    story.append(Paragraph("Sincerely,", body_style))
    story.append(Spacer(1, 5))
    story.append(Paragraph(f"<b>HR Recruiting Team</b>", bold_style))
    story.append(Paragraph(company.company_name, body_style))
    story.append(Paragraph(f"HR Contact: {company.hr_contact}", body_style))
    
    doc.build(story)


company_bp = Blueprint('company', __name__, url_prefix='/company')

def company_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if session.get('role') != 'COMPANY':
            return jsonify({'error': 'Unauthorized. Recruiter access required.'}), 403
        user_id = session.get('user_id')
        user = User.query.get(user_id)
        if not user or not user.is_active:
            return jsonify({'error': 'Your account has been deactivated.'}), 403
        company = Company.query.filter_by(user_id=user_id).first()
        if not company:
            return jsonify({'error': 'Company profile not found.'}), 404
        if company.is_blacklisted:
            return jsonify({'error': 'Your company has been blacklisted.'}), 403
        if company.approval_status != 'APPROVED':
            return jsonify({'error': 'Your company registration is pending admin approval.'}), 403
        return f(*args, **kwargs)
    return decorated_function

@company_bp.route('/drives', methods=['POST'])
@company_required
def create_drive():
    company = Company.query.filter_by(user_id=session.get('user_id')).first()
    data = request.get_json() or {}
    
    drive_name = data.get('drive_name')
    description = data.get('description')
    deadline_str = data.get('deadline')
    eligible_year = data.get('eligible_year')
    positions_data = data.get('positions', [])

    if not drive_name or not description or not deadline_str or not eligible_year:
        return jsonify({'error': 'Missing required fields for the drive.'}), 400

    if not positions_data:
        return jsonify({'error': 'A placement drive must contain at least one job position.'}), 400

    try:
        try:
            deadline = datetime.strptime(deadline_str, '%Y-%m-%d %H:%M')
        except ValueError:
            try:
                deadline = datetime.fromisoformat(deadline_str)
            except ValueError:
                return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD HH:MM.'}), 400
                
        tz = pytz.timezone('Asia/Kolkata')
        if deadline.tzinfo is None:
            deadline = tz.localize(deadline)
            
        new_drive = Drive()
        new_drive.company_id = company.id
        new_drive.drive_name = drive_name
        new_drive.description = description
        new_drive.deadline = deadline
        new_drive.eligible_year = int(eligible_year)
        new_drive.status = 'PENDING'
        db.session.add(new_drive)
        
        for p_data in positions_data:
            pos_name = p_data.get('position_name')
            pos_desc = p_data.get('description')
            min_cgpa = p_data.get('min_cgpa')
            branches = p_data.get('branches')
            salary = p_data.get('salary')
            skills = p_data.get('skills')
            location = p_data.get('location')
            mode = p_data.get('mode')
            
            if not pos_name or not pos_desc or min_cgpa is None or not branches or salary is None or not skills or not location or not mode:
                db.session.rollback()
                return jsonify({'error': 'All job position fields are required.'}), 400
                
            new_position = Position()
            new_position.drive = new_drive
            new_position.position_name = pos_name
            new_position.description = pos_desc
            new_position.min_cgpa = float(min_cgpa)
            new_position.branches = branches
            new_position.salary = int(salary)
            new_position.skills = skills
            new_position.location = location
            new_position.mode = mode
            db.session.add(new_position)
            
        db.session.commit()
        return jsonify({'message': 'Placement drive and job positions submitted for admin approval.', 'drive_id': new_drive.id}), 201
        
    except ValueError as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to create drive. Check your inputs.'}), 500

@company_bp.route('/drives', methods=['GET'])
@company_required
def get_company_drives():
    company = Company.query.filter_by(user_id=session.get('user_id')).first()
    try:
        drives = Drive.query.filter_by(company_id=company.id).all()
        result = []
        for d in drives:
            positions = []
            for p in d.positions:
                positions.append({
                    'id': p.id,
                    'position_name': p.position_name,
                    'description': p.description,
                    'min_cgpa': p.min_cgpa,
                    'branches': p.branches,
                    'salary': format_indian_currency(p.salary),
                    'raw_salary': p.salary,
                    'skills': p.skills,
                    'location': p.location,
                    'mode': p.mode
                })
            result.append({
                'id': d.id,
                'drive_name': d.drive_name,
                'description': d.description,
                'deadline': d.deadline.strftime('%d/%m/%Y %I:%M %p') if d.deadline else None,
                'raw_deadline': d.deadline.strftime('%Y-%m-%d %H:%M') if d.deadline else None,
                'status': d.status,
                'eligible_year': d.eligible_year,
                'created_at': d.created_at.strftime('%d/%m/%Y %I:%M %p') if d.created_at else None,
                'positions': positions
            })
        return jsonify({'drives': result}), 200
    except Exception as e:
        return jsonify({'error': 'Failed to retrieve drives.'}), 500

@company_bp.route('/applications', methods=['GET'])
@company_required
def get_company_applications():
    company = Company.query.filter_by(user_id=session.get('user_id')).first()
    try:
        applications = Application.query.join(Position).join(Drive).filter(Drive.company_id == company.id).all()
        result = []
        for a in applications:
            result.append({
                'id': a.id,
                'student': {
                    'id': a.student.id,
                    'full_name': a.student.full_name,
                    'branch': a.student.branch,
                    'cgpa': a.student.cgpa,
                    'grad_year': a.student.grad_year,
                    'phone': a.student.phone,
                    'skills': a.student.skills,
                    'experience': a.student.experience,
                    'resume_path': a.student.resume_path,
                    'github_url': a.student.github_url,
                    'linkedin_url': a.student.linkedin_url,
                    'portfolio_url': a.student.portfolio_url
                },
                'position': {
                    'id': a.position.id,
                    'position_name': a.position.position_name,
                    'drive_name': a.position.drive.drive_name
                },
                'applied_at': a.applied_at.strftime('%d/%m/%Y %I:%M %p') if a.applied_at else None,
                'status': a.status,
                'feedback': a.feedback
            })
        return jsonify({'applications': result}), 200
    except Exception as e:
        return jsonify({'error': 'Failed to retrieve applications.'}), 500

@company_bp.route('/applications/<int:app_id>/status', methods=['PUT'])
@company_required
def update_application_status(app_id):
    company = Company.query.filter_by(user_id=session.get('user_id')).first()
    a = Application.query.get(app_id)
    if not a:
        return jsonify({'error': 'Application not found.'}), 404
        
    if a.position.drive.company_id != company.id:
        return jsonify({'error': 'Unauthorized access to this application.'}), 403
        
    data = request.get_json() or {}
    status = data.get('status')
    feedback = data.get('feedback', '')
    
    if status not in ['SHORTLISTED', 'REJECTED']:
        return jsonify({'error': 'Status must be SHORTLISTED or REJECTED.'}), 400
        
    try:
        a.status = status
        a.feedback = feedback
        db.session.commit()
        return jsonify({'message': f'Application status updated to {status}.'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update application status.'}), 500

@company_bp.route('/interviews', methods=['POST'])
@company_required
def schedule_interview():
    company = Company.query.filter_by(user_id=session.get('user_id')).first()
    data = request.get_json() or {}
    
    app_id = data.get('application_id')
    start_time_str = data.get('start_time')
    duration = data.get('duration')
    location = data.get('location')
    meeting_link = data.get('meeting_link', '')
    
    if not app_id or not start_time_str or not duration or not location:
        return jsonify({'error': 'Missing required fields for interview.'}), 400
        
    a = Application.query.get(app_id)
    if not a:
        return jsonify({'error': 'Application not found.'}), 404
        
    if a.position.drive.company_id != company.id:
        return jsonify({'error': 'Unauthorized to schedule interview for this application.'}), 403
        
    if a.status not in ['SHORTLISTED', 'INTERVIEW']:
        return jsonify({'error': 'Interviews can only be scheduled for shortlisted applicants.'}), 400
        
    try:
        try:
            start_time = datetime.strptime(start_time_str, '%Y-%m-%d %H:%M')
        except ValueError:
            try:
                start_time = datetime.fromisoformat(start_time_str)
            except ValueError:
                return jsonify({'error': 'Invalid start time format. Use YYYY-MM-DD HH:MM.'}), 400
                
        tz = pytz.timezone('Asia/Kolkata')
        if start_time.tzinfo is None:
            start_time = tz.localize(start_time)
            
        new_interview = Interview()
        new_interview.application_id = a.id
        new_interview.start_time = start_time
        new_interview.duration = int(duration)
        new_interview.location = location
        new_interview.meeting_link = meeting_link
        new_interview.status = 'PENDING'
        
        a.status = 'INTERVIEW'
        
        db.session.add(new_interview)
        db.session.commit()
        return jsonify({'message': 'Interview scheduled successfully and status updated to INTERVIEW.', 'interview_id': new_interview.id}), 201
        
    except ValueError as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to schedule interview.'}), 500

@company_bp.route('/interviews', methods=['GET'])
@company_required
def get_company_interviews():
    company = Company.query.filter_by(user_id=session.get('user_id')).first()
    try:
        interviews = Interview.query.join(Application).join(Position).join(Drive).filter(Drive.company_id == company.id).all()
        result = []
        for i in interviews:
            result.append({
                'id': i.id,
                'student_name': i.application.student.full_name,
                'position_name': i.application.position.position_name,
                'start_time': i.start_time.strftime('%d/%m/%Y %I:%M %p') if i.start_time else None,
                'duration': i.duration,
                'location': i.location,
                'meeting_link': i.meeting_link,
                'status': i.status
            })
        return jsonify({'interviews': result}), 200
    except Exception as e:
        return jsonify({'error': 'Failed to retrieve interviews.'}), 500

@company_bp.route('/applications/<int:app_id>/select', methods=['POST'])
@company_required
def select_candidate(app_id):
    company = Company.query.filter_by(user_id=session.get('user_id')).first()
    a = Application.query.get(app_id)
    if not a:
        return jsonify({'error': 'Application not found.'}), 404
        
    if a.position.drive.company_id != company.id:
        return jsonify({'error': 'Unauthorized to select candidate.'}), 403
        
    if a.status != 'INTERVIEW':
        return jsonify({'error': 'Candidate must be in INTERVIEW stage to be selected.'}), 400
        
    # Check for upcoming pending interviews in the future
    now_ist = datetime.now(pytz.timezone('Asia/Kolkata'))
    pending_interview = Interview.query.filter(
        Interview.application_id == app_id,
        Interview.status == 'PENDING',
        Interview.start_time > now_ist
    ).first()
    if pending_interview:
        formatted_time = pending_interview.start_time.strftime('%d/%m/%Y %I:%M %p')
        return jsonify({'error': f'Interview already scheduled at {formatted_time}. Cannot select candidate.'}), 400

    data = request.get_json() or {}
    joining_date_str = data.get('joining_date')
    acceptance_deadline_str = data.get('acceptance_deadline')
    
    if not joining_date_str:
        return jsonify({'error': 'Joining date is required.'}), 400
    if not acceptance_deadline_str:
        return jsonify({'error': 'Offer acceptance deadline is required.'}), 400
        
    try:
        try:
            joining_date = datetime.strptime(joining_date_str, '%Y-%m-%d')
        except ValueError:
            try:
                joining_date = datetime.fromisoformat(joining_date_str)
            except ValueError:
                return jsonify({'error': 'Invalid joining date format. Use YYYY-MM-DD.'}), 400
                
        try:
            acceptance_deadline = datetime.strptime(acceptance_deadline_str, '%Y-%m-%d %H:%M')
        except ValueError:
            try:
                acceptance_deadline = datetime.fromisoformat(acceptance_deadline_str)
            except ValueError:
                return jsonify({'error': 'Invalid acceptance deadline format. Use YYYY-MM-DD HH:MM.'}), 400

        tz = pytz.timezone('Asia/Kolkata')
        if joining_date.tzinfo is None:
            joining_date = tz.localize(joining_date)
        if acceptance_deadline.tzinfo is None:
            acceptance_deadline = tz.localize(acceptance_deadline)

        if acceptance_deadline <= now_ist:
            return jsonify({'error': 'Acceptance deadline must be in the future.'}), 400
            
        student = a.student
        position = a.position
        
        static_folder = current_app.static_folder or os.path.join(os.getcwd(), 'frontend')
        offers_dir = os.path.join(static_folder, 'uploads', 'offers')
        os.makedirs(offers_dir, exist_ok=True)
        
        filename = f"offer_letter_app_{a.id}.pdf"
        file_path = os.path.join(offers_dir, filename)
        
        generate_offer_letter_pdf(file_path, student, company, position, joining_date, acceptance_deadline)
            
        web_path = f"/uploads/offers/{filename}"
        
        new_placement = Placement()
        new_placement.application_id = a.id
        new_placement.joining_date = joining_date
        new_placement.acceptance_deadline = acceptance_deadline
        new_placement.offer_letter_path = web_path
        new_placement.status = 'PENDING'
        
        a.status = 'PLACED'
        
        db.session.add(new_placement)
        db.session.commit()
        
        return jsonify({
            'message': 'Candidate selected. Offer letter generated successfully.',
            'placement_id': new_placement.id,
            'offer_letter_url': web_path
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to select candidate: {str(e)}'}), 500


@company_bp.route('/drives/<int:drive_id>', methods=['PUT'])
@company_required
def edit_drive(drive_id):
    company = Company.query.filter_by(user_id=session.get('user_id')).first()
    drive = Drive.query.get(drive_id)
    if not drive:
        return jsonify({'error': 'Drive not found.'}), 404
        
    if drive.company_id != company.id:
        return jsonify({'error': 'Unauthorized to edit this drive.'}), 403
        
    if drive.status != 'PENDING':
        return jsonify({'error': 'Approved or closed drives cannot be edited.'}), 400
        
    data = request.get_json() or {}
    drive_name = data.get('drive_name')
    description = data.get('description')
    deadline_str = data.get('deadline')
    eligible_year = data.get('eligible_year')
    positions_data = data.get('positions', [])

    if not drive_name or not description or not deadline_str or not eligible_year:
        return jsonify({'error': 'Missing required fields for the drive.'}), 400

    if not positions_data:
        return jsonify({'error': 'A placement drive must contain at least one job position.'}), 400

    try:
        try:
            deadline = datetime.strptime(deadline_str, '%Y-%m-%d %H:%M')
        except ValueError:
            try:
                deadline = datetime.fromisoformat(deadline_str)
            except ValueError:
                return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD HH:MM.'}), 400
                
        tz = pytz.timezone('Asia/Kolkata')
        if deadline.tzinfo is None:
            deadline = tz.localize(deadline)
            
        drive.drive_name = drive_name
        drive.description = description
        drive.deadline = deadline
        drive.eligible_year = int(eligible_year)
        
        # Delete existing positions and re-add them
        for pos in list(drive.positions):
            db.session.delete(pos)
            
        for p_data in positions_data:
            pos_name = p_data.get('position_name')
            pos_desc = p_data.get('description')
            min_cgpa = p_data.get('min_cgpa')
            branches = p_data.get('branches')
            salary = p_data.get('salary')
            skills = p_data.get('skills')
            location = p_data.get('location')
            mode = p_data.get('mode')
            
            if not pos_name or not pos_desc or min_cgpa is None or not branches or salary is None or not skills or not location or not mode:
                db.session.rollback()
                return jsonify({'error': 'All job position fields are required.'}), 400
                
            new_position = Position()
            new_position.drive = drive
            new_position.position_name = pos_name
            new_position.description = pos_desc
            new_position.min_cgpa = float(min_cgpa)
            new_position.branches = branches
            new_position.salary = int(salary)
            new_position.skills = skills
            new_position.location = location
            new_position.mode = mode
            db.session.add(new_position)
            
        db.session.commit()
        return jsonify({'message': 'Placement drive and job positions updated successfully.', 'drive_id': drive.id}), 200
        
    except ValueError as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update drive. Check your inputs.'}), 500


@company_bp.route('/drives/<int:drive_id>', methods=['DELETE'])
@company_required
def delete_drive(drive_id):
    company = Company.query.filter_by(user_id=session.get('user_id')).first()
    drive = Drive.query.get(drive_id)
    if not drive:
        return jsonify({'error': 'Drive not found.'}), 404
        
    if drive.company_id != company.id:
        return jsonify({'error': 'Unauthorized to delete this drive.'}), 403
        
    if drive.status != 'PENDING':
        return jsonify({'error': 'Approved or closed drives cannot be deleted.'}), 400
        
    try:
        db.session.delete(drive)
        db.session.commit()
        return jsonify({'message': 'Placement drive deleted successfully.'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to delete placement drive.'}), 500

