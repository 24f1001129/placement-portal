from flask import Blueprint, request, jsonify, session
from functools import wraps
from backend.models import User, Student, Company, Drive, Position, Application, db
from backend.extensions import cache
from backend.tasks import generate_monthly_company_reports
from sqlalchemy import func

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if session.get('role') != 'ADMIN':
            return jsonify({'error': 'Unauthorized. Admin access required.'}), 403
        return f(*args, **kwargs)
    return decorated_function

@admin_bp.route('/stats', methods=['GET'])
@admin_required
@cache.cached(timeout=60, key_prefix='admin_dashboard')
def get_stats():
    try:
        total_students = Student.query.count()
        total_companies = Company.query.filter_by(approval_status='APPROVED').count()
        total_drives = Drive.query.filter_by(status='APPROVED').count()
        total_applications = Application.query.count()
        
        # Additional statistics
        placed_students = Student.query.join(Application).filter(Application.status == 'PLACED').distinct().count()
        pending_companies = Company.query.filter_by(approval_status='PENDING').count()
        pending_drives = Drive.query.filter_by(status='PENDING').count()

        return jsonify({
            'total_students': total_students,
            'total_companies': total_companies,
            'total_drives': total_drives,
            'total_applications': total_applications,
            'placed_students': placed_students,
            'pending_companies': pending_companies,
            'pending_drives': pending_drives
        }), 200
    except Exception as e:
        return jsonify({'error': 'Failed to retrieve admin stats'}), 500

@admin_bp.route('/companies', methods=['GET'])
@admin_required

def get_companies():
    search = request.args.get('search', '').strip()
    try:
        query = Company.query
        if search:
            query = query.filter(
                (Company.company_name.ilike(f'%{search}%')) | 
                (Company.industry.ilike(f'%{search}%')) |
                (Company.location.ilike(f'%{search}%'))
            )
        companies = query.all()
        
        result = []
        for c in companies:
            result.append({
                'id': c.id,
                'email': c.user.email,
                'company_name': c.company_name,
                'industry': c.industry,
                'location': c.location,
                'website': c.website,
                'description': c.description,
                'hr_contact': c.hr_contact,
                'approval_status': c.approval_status,
                'is_blacklisted': c.is_blacklisted
            })
        return jsonify({'companies': result}), 200
    except Exception as e:
        return jsonify({'error': 'Failed to retrieve companies'}), 500

@admin_bp.route('/companies/<int:company_id>/status', methods=['PUT'])
@admin_required
def update_company_status(company_id):
    data = request.get_json() or {}
    status = data.get('approval_status')
    
    if status not in ['APPROVED', 'REJECTED']:
        return jsonify({'error': 'Invalid status option'}), 400
        
    company = Company.query.get(company_id)
    if not company:
        return jsonify({'error': 'Company not found'}), 404
        
    try:
        company.approval_status = status
        db.session.commit()
        cache.clear()
        return jsonify({'message': f'Company {status.lower()} successfully.'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update company status'}), 500

@admin_bp.route('/companies/<int:company_id>/blacklist', methods=['PUT'])
@admin_required
def toggle_company_blacklist(company_id):
    company = Company.query.get(company_id)
    if not company:
        return jsonify({'error': 'Company not found'}), 404
        
    try:
        company.is_blacklisted = not company.is_blacklisted
        # Keep user active state synchronized
        company.user.is_active = not company.is_blacklisted
        db.session.commit()
        
        cache.clear()
        action = 'blacklisted' if company.is_blacklisted else 'removed from blacklist'
        return jsonify({'message': f'Company successfully {action}'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update blacklist status'}), 500

@admin_bp.route('/students', methods=['GET'])
@admin_required

def get_students():
    search = request.args.get('search', '').strip()
    try:
        query = Student.query
        if search:
            query = query.filter(
                (Student.full_name.ilike(f'%{search}%')) |
                (Student.branch.ilike(f'%{search}%')) |
                (Student.skills.ilike(f'%{search}%'))
            )
        students = query.all()
        
        result = []
        for s in students:
            result.append({
                'id': s.id,
                'email': s.user.email,
                'full_name': s.full_name,
                'branch': s.branch,
                'cgpa': s.cgpa,
                'grad_year': s.grad_year,
                'phone': s.phone,
                'skills': s.skills,
                'experience': s.experience,
                'resume_path': s.resume_path,
                'github_url': s.github_url,
                'linkedin_url': s.linkedin_url,
                'portfolio_url': s.portfolio_url,
                'is_blacklisted': s.is_blacklisted
            })
        return jsonify({'students': result}), 200
    except Exception as e:
        return jsonify({'error': 'Failed to retrieve students'}), 500

@admin_bp.route('/students/<int:student_id>/blacklist', methods=['PUT'])
@admin_required
def toggle_student_blacklist(student_id):
    student = Student.query.get(student_id)
    if not student:
        return jsonify({'error': 'Student not found'}), 404
        
    try:
        student.is_blacklisted = not student.is_blacklisted
        # Keep user active state synchronized
        student.user.is_active = not student.is_blacklisted
        db.session.commit()
        
        cache.clear()
        action = 'blacklisted' if student.is_blacklisted else 'removed from blacklist'
        return jsonify({'message': f'Student successfully {action}'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update blacklist status'}), 500

@admin_bp.route('/drives', methods=['GET'])
@admin_required
def get_drives():
    try:
        drives = Drive.query.all()
        result = []
        for d in drives:
            result.append({
                'id': d.id,
                'company_name': d.company.company_name,
                'drive_name': d.drive_name,
                'description': d.description,
                'deadline': d.deadline.strftime('%d/%m/%Y %I:%M %p'),
                'status': d.status,
                'eligible_year': d.eligible_year
            })
        return jsonify({'drives': result}), 200
    except Exception as e:
        return jsonify({'error': 'Failed to retrieve placement drives'}), 500

@admin_bp.route('/drives/<int:drive_id>/status', methods=['PUT'])
@admin_required
def update_drive_status(drive_id):
    data = request.get_json() or {}
    status = data.get('status')
    
    if status not in ['APPROVED', 'REJECTED', 'CLOSED']:
        return jsonify({'error': 'Invalid status option'}), 400
        
    drive = Drive.query.get(drive_id)
    if not drive:
        return jsonify({'error': 'Drive not found'}), 404
        
    try:
        drive.status = status
        db.session.commit()
        cache.clear()
        return jsonify({'message': f'Drive status updated to {status}'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update drive status'}), 500

@admin_bp.route('/applications', methods=['GET'])
@admin_required
def get_applications():
    try:
        applications = Application.query.all()
        result = []
        for a in applications:
            result.append({
                'id': a.id,
                'student_name': a.student.full_name,
                'student_branch': a.student.branch,
                'position_name': a.position.position_name,
                'company_name': a.position.drive.company.company_name,
                'applied_at': a.applied_at.strftime('%d/%m/%Y %I:%M %p'),
                'status': a.status
            })
        return jsonify({'applications': result}), 200
    except Exception as e:
        return jsonify({'error': 'Failed to retrieve applications'}), 500

@admin_bp.route('/reports/trigger', methods=['POST'])
@admin_required
def generate_reports():
    try:
        task = generate_monthly_company_reports.delay()
        return jsonify({'message': 'Monthly reports generation triggered.', 'task_id': task.id}), 200
    except Exception as e:
        return jsonify({'error': 'Failed to trigger report generation task.'}), 500

@admin_bp.route('/chart-data', methods=['GET'])
@admin_required
@cache.cached(timeout=60, key_prefix='admin_chart_data')
def get_admin_chart_data():
    try:
        # Placement Status
        total_students = Student.query.count()
        placed_students = Student.query.join(Application).filter(Application.status.in_(['SELECTED', 'PLACED'])).distinct().count()
        unplaced_students = total_students - placed_students
        
        # Top Companies by Applications
        top_companies_query = db.session.query(
            Company.company_name, 
            func.count(Application.id).label('app_count')
        ).select_from(Company)\
         .join(Drive, Company.id == Drive.company_id)\
         .join(Position, Drive.id == Position.drive_id)\
         .join(Application, Position.id == Application.position_id)\
         .group_by(Company.id)\
         .order_by(func.count(Application.id).desc())\
         .limit(5).all()
         
        top_companies = [{'name': row[0], 'applications': row[1]} for row in top_companies_query]
        
        # Companies vs Drives
        total_companies = Company.query.filter_by(approval_status='APPROVED').count()
        total_drives = Drive.query.filter_by(status='APPROVED').count()
        
        return jsonify({
            'placement_status': {
                'placed': placed_students,
                'unplaced': unplaced_students
            },
            'top_companies': top_companies,
            'companies_vs_drives': {
                'companies': total_companies,
                'drives': total_drives
            }
        }), 200
    except Exception as e:
        print(f"Error generating admin chart data: {e}")
        return jsonify({'error': 'Failed to fetch chart data'}), 500