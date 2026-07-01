from flask import Blueprint, request, jsonify, session, current_app
from functools import wraps
from datetime import datetime
import pytz
import os
from werkzeug.utils import secure_filename
from backend.models import User, Student, Company, Drive, Position, Application, Placement, Interview, db
from backend.models.database import format_indian_currency
from backend.extensions import cache
from backend.tasks import export_application_history, send_status_update_email

student_bp = Blueprint('student', __name__, url_prefix='/student')

def student_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if session.get('role') != 'STUDENT':
            return jsonify({'error': 'Unauthorized. Student access required.'}), 403
        user_id = session.get('user_id')
        user = User.query.get(user_id)
        if not user or not user.is_active:
            return jsonify({'error': 'Your account has been deactivated.'}), 403
        student = Student.query.filter_by(user_id=user_id).first()
        if not student:
            return jsonify({'error': 'Student profile not found.'}), 404
        if student.is_blacklisted:
            return jsonify({'error': 'Your account has been blacklisted by the placement cell.'}), 403
        return f(*args, **kwargs)
    return decorated_function

@student_bp.route('/drives', methods=['GET'])
@student_required
@cache.cached(timeout=60, key_prefix='student_drives')
def get_student_drives():
    try:
        # Fetch only APPROVED drives of non-blacklisted companies
        drives = Drive.query.join(Company).filter(
            Drive.status == 'APPROVED',
            Company.is_blacklisted == False
        ).all()
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
                'company_name': d.company.company_name,
                'drive_name': d.drive_name,
                'description': d.description,
                'deadline': d.deadline.strftime('%d/%m/%Y %I:%M %p') if d.deadline else None,
                'eligible_year': d.eligible_year,
                'positions': positions
            })
        return jsonify({'drives': result}), 200
    except Exception as e:
        return jsonify({'error': 'Failed to retrieve placement drives.'}), 500

@student_bp.route('/apply', methods=['POST'])
@student_required
def apply_to_position():
    student = Student.query.filter_by(user_id=session.get('user_id')).first()
    data = request.get_json() or {}
    position_id = data.get('position_id')
    
    if not position_id:
        return jsonify({'error': 'Position ID is required.'}), 400
        
    pos = Position.query.get(position_id)
    if not pos:
        return jsonify({'error': 'Position not found.'}), 404
        
    if pos.drive.status != 'APPROVED':
        return jsonify({'error': 'Cannot apply to a drive that is not approved.'}), 400
        
    if pos.drive.company.is_blacklisted:
        return jsonify({'error': 'This company has been blacklisted. Applications are suspended.'}), 400
        
    # Check if student already has an ACCEPTED placement
    accepted_placement = Placement.query.join(Application).filter(
        Application.student_id == student.id,
        Placement.status == 'ACCEPTED'
    ).first()
    if accepted_placement:
        return jsonify({'error': 'You have already accepted a placement offer. Cannot apply for other positions.'}), 400
        
    # Check duplicate application
    existing_app = Application.query.filter_by(student_id=student.id, position_id=pos.id).first()
    if existing_app:
        return jsonify({'error': 'You have already applied for this position.'}), 409
        
    try:
        new_app = Application()
        new_app.student_id = student.id
        new_app.position_id = pos.id
        new_app.status = 'APPLIED'
        db.session.add(new_app)
        db.session.commit()
        
        # Send email notification
        send_status_update_email.delay(
            student_email=student.user.email,
            student_name=student.full_name,
            position_name=pos.position_name,
            company_name=pos.drive.company.company_name,
            status='APPLIED'
        )
        
        cache.delete('admin_dashboard')
        return jsonify({'message': 'Application submitted successfully.', 'application_id': new_app.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to submit application.'}), 500

@student_bp.route('/applications', methods=['GET'])
@student_required
def get_student_applications():
    student = Student.query.filter_by(user_id=session.get('user_id')).first()
    try:
        applications = Application.query.filter_by(student_id=student.id).all()
        result = []
        for a in applications:
            # Gather interviews for this application
            interviews = []
            for i in a.interviews:
                interviews.append({
                    'id': i.id,
                    'start_time': i.start_time.strftime('%d/%m/%Y %I:%M %p') if i.start_time else None,
                    'duration': i.duration,
                    'location': i.location,
                    'meeting_link': i.meeting_link,
                    'status': i.status
                })
            result.append({
                'id': a.id,
                'position': {
                    'id': a.position.id,
                    'position_name': a.position.position_name,
                    'company_name': a.position.drive.company.company_name,
                    'salary': format_indian_currency(a.position.salary),
                    'raw_salary': a.position.salary,
                    'location': a.position.location
                },
                'applied_at': a.applied_at.strftime('%d/%m/%Y %I:%M %p') if a.applied_at else None,
                'status': a.status,
                'feedback': a.feedback,
                'interviews': interviews
            })
        return jsonify({'applications': result}), 200
    except Exception as e:
        return jsonify({'error': 'Failed to retrieve applications.'}), 500

@student_bp.route('/interviews', methods=['GET'])
@student_required
def get_student_interviews():
    student = Student.query.filter_by(user_id=session.get('user_id')).first()
    try:
        interviews = Interview.query.join(Application).filter(Application.student_id == student.id).all()
        result = []
        for i in interviews:
            result.append({
                'id': i.id,
                'company_name': i.application.position.drive.company.company_name,
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

@student_bp.route('/placements', methods=['GET'])
@student_required
def get_student_placements():
    student = Student.query.filter_by(user_id=session.get('user_id')).first()
    try:
        placements = Placement.query.join(Application).filter(Application.student_id == student.id).all()
        result = []
        for p in placements:
            result.append({
                'id': p.id,
                'company_name': p.application.position.drive.company.company_name,
                'position_name': p.application.position.position_name,
                'joining_date': p.joining_date.strftime('%d/%m/%Y') if p.joining_date else None,
                'offer_letter_path': p.offer_letter_path,
                'status': p.status,
                'created_at': p.created_at.strftime('%d/%m/%Y %I:%M %p') if p.created_at else None,
                'acceptance_deadline': p.acceptance_deadline.strftime('%d/%m/%Y %I:%M %p') if p.acceptance_deadline else None,
                'raw_acceptance_deadline': p.acceptance_deadline.isoformat() if p.acceptance_deadline else None
            })
        return jsonify({'placements': result}), 200
    except Exception as e:
        return jsonify({'error': 'Failed to retrieve placements.'}), 500

@student_bp.route('/placements/<int:placement_id>/status', methods=['PUT'])
@student_required
def update_placement_status(placement_id):
    student = Student.query.filter_by(user_id=session.get('user_id')).first()
    p = Placement.query.get(placement_id)
    if not p:
        return jsonify({'error': 'Placement offer not found.'}), 404
        
    if p.application.student_id != student.id:
        return jsonify({'error': 'Unauthorized to modify this offer.'}), 403
        
    # Check if offer has expired
    now_ist = datetime.now(pytz.timezone('Asia/Kolkata'))
    if p.acceptance_deadline:
        p_deadline = p.acceptance_deadline
        if p_deadline.tzinfo is None:
            p_deadline = pytz.timezone('Asia/Kolkata').localize(p_deadline)
        if now_ist.tzinfo is None:
            now_ist = pytz.timezone('Asia/Kolkata').localize(now_ist)
        if now_ist > p_deadline:
            return jsonify({'error': 'Offer acceptance deadline has passed. Cannot update status.'}), 400

    data = request.get_json() or {}
    status = data.get('status')
    
    if status not in ['ACCEPTED', 'REJECTED']:
        return jsonify({'error': 'Status must be ACCEPTED or REJECTED.'}), 400
        
    try:
        p.status = status
        db.session.commit()
        cache.delete('admin_dashboard')
        return jsonify({'message': f'Placement offer successfully {status.lower()}.', 'status': p.status}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update placement status.'}), 500

@student_bp.route('/upload_resume', methods=['POST'])
@student_required
def upload_resume():
    student = Student.query.filter_by(user_id=session.get('user_id')).first()
    if 'resume' not in request.files:
        return jsonify({'error': 'No resume file provided.'}), 400
        
    file = request.files['resume']
    if file.filename == '':
        return jsonify({'error': 'Empty filename.'}), 400
        
    if not file.filename.lower().endswith('.pdf'):
        return jsonify({'error': 'Only PDF resume files are allowed.'}), 400
        
    try:
        # Setup uploads/resumes directory
        static_folder = current_app.static_folder or os.path.join(os.getcwd(), 'frontend')
        resumes_dir = os.path.join(static_folder, 'uploads', 'resumes')
        os.makedirs(resumes_dir, exist_ok=True)
        
        filename = f"resume_student_{student.id}.pdf"
        file_path = os.path.join(resumes_dir, filename)
        
        file.save(file_path)
        
        web_path = f"/uploads/resumes/{filename}"
        student.resume_path = web_path
        db.session.commit()
        
        return jsonify({'message': 'Resume uploaded successfully.', 'resume_url': web_path}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to save resume file.'}), 500

@student_bp.route('/export', methods=['POST'])
@student_required
def export_data():
    from backend.tasks import export_application_history
    user_id = session.get('user_id')
    student = Student.query.filter_by(user_id=user_id).first()
    email = student.user.email
    
    try:
        task = export_application_history.delay(user_id, 'STUDENT', email)
        return jsonify({'message': 'Data export started.', 'task_id': task.id}), 200
    except Exception as e:
        return jsonify({'error': 'Failed to trigger data export task.'}), 500
