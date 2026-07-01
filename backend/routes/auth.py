from flask import Blueprint, request, jsonify, session, current_app
import os
from werkzeug.security import generate_password_hash, check_password_hash
from backend.models import User, Student, Company, db
from backend.extensions import cache

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')

@auth_bp.route('/register/student', methods=['POST'])
def register_student():
    data = request.form
    
    # Required fields check
    required_fields = ['email', 'password', 'full_name', 'branch', 'cgpa', 'grad_year', 'phone', 'skills', 'github_url', 'linkedin_url']
    missing = [field for field in required_fields if not data.get(field)]
    
    resume_file = request.files.get('resume')
    if not resume_file:
        missing.append('resume')
        
    if missing:
        return jsonify({'error': f'Missing fields: {", ".join(missing)}'}), 400

    email = data.get('email')
    password = data.get('password')
    
    # Check if user already exists
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email is already registered'}), 409

    try:
        # Create user
        new_user = User()
        new_user.email = email
        new_user.password_hash = generate_password_hash(password)
        new_user.role = 'STUDENT'
        
        # Create student profile
        new_student = Student()
        new_student.user = new_user
        new_student.full_name = data.get('full_name')
        new_student.branch = data.get('branch')
        new_student.cgpa = float(data.get('cgpa'))
        new_student.grad_year = int(data.get('grad_year'))
        new_student.phone = data.get('phone')
        new_student.skills = data.get('skills')
        new_student.experience = data.get('experience', '')
        new_student.github_url = data.get('github_url')
        new_student.linkedin_url = data.get('linkedin_url')
        new_student.portfolio_url = data.get('portfolio_url', '')
        # Set a temporary path because it cannot be null
        new_student.resume_path = 'pending_upload.pdf'
        
        db.session.add(new_user)
        db.session.add(new_student)
        db.session.flush() # To get the new student ID
        
        if resume_file.filename != '' and resume_file.filename.lower().endswith('.pdf'):
            static_folder = current_app.static_folder or os.path.join(os.getcwd(), 'frontend')
            resumes_dir = os.path.join(static_folder, 'uploads', 'resumes')
            os.makedirs(resumes_dir, exist_ok=True)
            filename = f"resume_student_{new_student.id}.pdf"
            file_path = os.path.join(resumes_dir, filename)
            resume_file.save(file_path)
            new_student.resume_path = f"/uploads/resumes/{filename}"
            
        db.session.commit()
        cache.delete('admin_dashboard')
        return jsonify({'message': 'Student registered successfully. You can now login.'}), 201
        
    except ValueError as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'An error occurred during registration. Please check your inputs.'}), 500

@auth_bp.route('/register/company', methods=['POST'])
def register_company():
    data = request.get_json() or {}
    
    # Required fields check
    required_fields = ['email', 'password', 'company_name', 'industry', 'location', 'website', 'description', 'hr_contact']
    missing = [field for field in required_fields if not data.get(field)]
    if missing:
        return jsonify({'error': f'Missing fields: {", ".join(missing)}'}), 400

    email = data.get('email')
    password = data.get('password')
    company_name = data.get('company_name')

    # Check email and company name uniqueness
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email is already registered'}), 409
    if Company.query.filter_by(company_name=company_name).first():
        return jsonify({'error': 'Company name is already registered'}), 409

    try:
        new_user = User()
        new_user.email = email
        new_user.password_hash = generate_password_hash(password)
        new_user.role = 'COMPANY'
        
        new_company = Company()
        new_company.user = new_user
        new_company.company_name = company_name
        new_company.industry = data.get('industry')
        new_company.location = data.get('location')
        new_company.website = data.get('website')
        new_company.description = data.get('description')
        new_company.hr_contact = data.get('hr_contact')
        new_company.approval_status = 'PENDING'
        
        db.session.add(new_user)
        db.session.add(new_company)
        db.session.commit()
        cache.delete('admin_dashboard')
        return jsonify({'message': 'Company profile submitted successfully. Access is pending admin approval.'}), 201
        
    except ValueError as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'An error occurred during registration. Please check your inputs.'}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({'error': 'Invalid email or password'}), 401

    if not user.is_active:
        return jsonify({'error': 'Your account has been deactivated.'}), 403

    # Check approval status if role is COMPANY
    if user.role == 'COMPANY':
        company = Company.query.filter_by(user_id=user.id).first()
        if not company:
            return jsonify({'error': 'Company profile not found.'}), 404
        if company.is_blacklisted:
            return jsonify({'error': 'Your company has been blacklisted.'}), 403
        if company.approval_status == 'PENDING':
            return jsonify({'error': 'Your registration is still pending admin approval.'}), 403
        if company.approval_status == 'REJECTED':
            return jsonify({'error': 'Your registration request was rejected.'}), 403

    # Check student blacklisted status if role is STUDENT
    if user.role == 'STUDENT':
        student = Student.query.filter_by(user_id=user.id).first()
        if not student:
            return jsonify({'error': 'Student profile not found.'}), 404
        if student.is_blacklisted:
            return jsonify({'error': 'Your account has been blacklisted by the placement cell.'}), 403

    # Save to Flask Session
    session['user_id'] = user.id
    session['role'] = user.role

    # Prepare response profile data
    profile_data = {
        'id': user.id,
        'email': user.email,
        'role': user.role
    }
    
    if user.role == 'STUDENT':
        student = Student.query.filter_by(user_id=user.id).first()
        profile_data['student_id'] = student.id
        profile_data['name'] = student.full_name
    elif user.role == 'COMPANY':
        company = Company.query.filter_by(user_id=user.id).first()
        profile_data['company_id'] = company.id
        profile_data['name'] = company.company_name

    return jsonify({
        'message': 'Login successful',
        'user': profile_data
    }), 200

@auth_bp.route('/me', methods=['GET'])
def me():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Not logged in'}), 401

    user = User.query.get(user_id)
    if not user or not user.is_active:
        session.clear()
        return jsonify({'error': 'Session invalid or user deactivated'}), 401

    profile_data = {
        'id': user.id,
        'email': user.email,
        'role': user.role
    }

    if user.role == 'STUDENT':
        student = Student.query.filter_by(user_id=user.id).first()
        if student.is_blacklisted:
            session.clear()
            return jsonify({'error': 'Your account has been blacklisted.'}), 403
        profile_data['student_id'] = student.id
        profile_data['name'] = student.full_name
        profile_data['details'] = {
            'branch': student.branch,
            'cgpa': student.cgpa,
            'grad_year': student.grad_year,
            'phone': student.phone,
            'skills': student.skills,
            'experience': student.experience,
            'resume_path': student.resume_path,
            'github_url': student.github_url,
            'linkedin_url': student.linkedin_url,
            'portfolio_url': student.portfolio_url
        }
    elif user.role == 'COMPANY':
        company = Company.query.filter_by(user_id=user.id).first()
        if company.is_blacklisted or company.approval_status != 'APPROVED':
            session.clear()
            return jsonify({'error': 'Your company account is inactive or pending.'}), 403
        profile_data['company_id'] = company.id
        profile_data['name'] = company.company_name
        profile_data['details'] = {
            'industry': company.industry,
            'location': company.location,
            'website': company.website,
            'description': company.description,
            'hr_contact': company.hr_contact
        }

    return jsonify({'user': profile_data}), 200

@auth_bp.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logged out successfully'}), 200

@auth_bp.route('/profile', methods=['PUT'])
def update_profile():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Not logged in'}), 401

    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json() or {}

    try:
        if user.role == 'STUDENT':
            student = Student.query.filter_by(user_id=user.id).first()
            if not student:
                return jsonify({'error': 'Student profile not found'}), 404
            
            # Updateable fields
            if 'full_name' in data: student.full_name = data['full_name']
            if 'branch' in data: student.branch = data['branch']
            if 'cgpa' in data: student.cgpa = float(data['cgpa'])
            if 'grad_year' in data: student.grad_year = int(data['grad_year'])
            if 'phone' in data: student.phone = data['phone']
            if 'skills' in data: student.skills = data['skills']
            if 'experience' in data: student.experience = data['experience']
            if 'github_url' in data: student.github_url = data['github_url']
            if 'linkedin_url' in data: student.linkedin_url = data['linkedin_url']
            if 'portfolio_url' in data: student.portfolio_url = data['portfolio_url']

        elif user.role == 'COMPANY':
            company = Company.query.filter_by(user_id=user.id).first()
            if not company:
                return jsonify({'error': 'Company profile not found'}), 404
            
            # Updateable fields
            if 'industry' in data: company.industry = data['industry']
            if 'location' in data: company.location = data['location']
            if 'website' in data: company.website = data['website']
            if 'description' in data: company.description = data['description']
            if 'hr_contact' in data: company.hr_contact = data['hr_contact']

        db.session.commit()
        return jsonify({'message': 'Profile updated successfully'}), 200

    except ValueError as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update profile details'}), 500

@auth_bp.route('/tasks/<task_id>/status', methods=['GET'])
def get_task_status(task_id):
    from celery.result import AsyncResult
    try:
        task_result = AsyncResult(task_id)
        result = {
            "task_id": task_id,
            "task_status": task_result.status,
            "task_result": task_result.result if task_result.status == 'SUCCESS' else str(task_result.info)
        }
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': 'Failed to check task status.'}), 500