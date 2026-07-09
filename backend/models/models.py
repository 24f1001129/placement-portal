from .database import db
from datetime import datetime, timedelta
import pytz
from sqlalchemy.orm import validates

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(128), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(pytz.timezone('Asia/Kolkata')))

    company = db.relationship('Company', backref='user', lazy=True, uselist=False, cascade='all, delete-orphan')
    student = db.relationship('Student', backref='user', lazy=True, uselist=False, cascade='all, delete-orphan')

class Company(db.Model):
    __tablename__ = 'companies'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True)
    company_name = db.Column(db.String(255), unique=True, nullable=False)
    industry = db.Column(db.String(32), nullable=False)
    location = db.Column(db.String(32), nullable=False)
    website = db.Column(db.String(128), nullable=False, unique=True)
    description = db.Column(db.String(255), nullable=False)
    hr_contact = db.Column(db.String(128), nullable=False, unique=True)
    approval_status = db.Column(db.String(16), nullable=False, default='PENDING', index=True)
    is_blacklisted = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(pytz.timezone('Asia/Kolkata')))

    drives = db.relationship('Drive', backref='company', lazy=True, cascade='all, delete-orphan')

class Student(db.Model):
    __tablename__ = 'students'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True)
    full_name = db.Column(db.String(64), nullable=False)
    branch = db.Column(db.String(32), nullable=False)
    cgpa = db.Column(db.Float, nullable=False)
    grad_year = db.Column(db.Integer, nullable=False)
    phone = db.Column(db.String(10), nullable=False, unique=True)
    skills = db.Column(db.String(255), nullable=False)
    experience = db.Column(db.String(255))
    resume_path = db.Column(db.String(255), nullable=False)
    github_url = db.Column(db.String(64), nullable=False, unique=True)
    linkedin_url = db.Column(db.String(64), nullable=False, unique=True)
    portfolio_url = db.Column(db.String(64), unique=True) 
    is_blacklisted = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(pytz.timezone('Asia/Kolkata')))

    @validates("cgpa", "phone", "grad_year", "github_url", "linkedin_url")
    def validate(self, key, value):
        if key == "cgpa":
            if not (0.0 <= value <= 10.0):
                raise ValueError("CGPA must be between 0.0 and 10.0")
        if key == "phone":
            if not value.isdigit() or len(value) != 10:
                raise ValueError("Phone number must be 10 digits")
        if key == "grad_year":
            if  len(str(value)) != 4 or not str(value).isdigit():
                raise ValueError("Invalid graduation year")
        if key == "github_url":
            if not value.startswith("https://github.com/"):
                raise ValueError("Invalid URL")
        if key == "linkedin_url":
            if not value.startswith("https://www.linkedin.com/in/"):
                raise ValueError("Invalid URL")
        return value
    

    applications = db.relationship('Application', backref='student', lazy=True, cascade='all, delete-orphan')

class Drive(db.Model):
    __tablename__ = 'drives'
    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False, index=True)
    drive_name = db.Column(db.String(64), nullable=False)
    description = db.Column(db.String(128), nullable=False)
    deadline = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(16), nullable=False, default='PENDING', index=True)
    eligible_year = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(pytz.timezone('Asia/Kolkata')))
    @validates("deadline", "eligible_year")
    def validate(self, key, value):
        if key == "deadline" and value:
            dt_val = value
            if isinstance(dt_val, str):
                try:
                    dt_val = datetime.strptime(dt_val, '%Y-%m-%d %H:%M')
                except ValueError:
                    pass
            if isinstance(dt_val, datetime):
                now = datetime.now(dt_val.tzinfo) if getattr(dt_val, 'tzinfo', None) else datetime.now()
                if dt_val < now - timedelta(minutes=5):
                    raise ValueError("Deadline must be in the future")
        if key == "eligible_year":
            if len(str(value)) != 4 or not str(value).isdigit():
                raise ValueError("Invalid graduation year")
        return value

    positions = db.relationship('Position', backref='drive', lazy=True, cascade='all, delete-orphan')

class Position(db.Model):
    __tablename__ = 'positions'
    id = db.Column(db.Integer, primary_key=True)
    drive_id = db.Column(db.Integer, db.ForeignKey('drives.id', ondelete='CASCADE'), nullable=False, index=True)
    position_name = db.Column(db.String(64), nullable=False)
    description = db.Column(db.String(256), nullable=False)
    min_cgpa = db.Column(db.Float, nullable=False)
    branches = db.Column(db.String(128), nullable=False)
    salary = db.Column(db.Integer, nullable=False)
    skills = db.Column(db.String(256), nullable=False)
    location = db.Column(db.String(32), nullable=False)
    mode = db.Column(db.String(32), nullable=False)

    @validates("min_cgpa")
    def validate(self, key, value):
        if key == "min_cgpa":
            if not(5.0 <= value <= 10.0):
                raise ValueError("Invalid cgpa")
        return value

    applications = db.relationship('Application', backref='position', lazy=True, cascade='all, delete-orphan')

class Application(db.Model):
    __tablename__ = 'applications'
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id', ondelete='CASCADE'), nullable=False, index=True)
    position_id = db.Column(db.Integer, db.ForeignKey('positions.id', ondelete='CASCADE'), nullable=False, index=True)
    applied_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(pytz.timezone('Asia/Kolkata')))
    status = db.Column(db.String(16), nullable=False, default='DRAFT', index=True)
    feedback = db.Column(db.String(255), nullable=True)
    ats_score = db.Column(db.Integer, nullable=True, default=0)


class Placement(db.Model):
    __tablename__ = 'placements'
    id = db.Column(db.Integer, primary_key=True)
    application_id = db.Column(db.Integer, db.ForeignKey('applications.id', ondelete='CASCADE'), nullable=False, unique=True)
    joining_date = db.Column(db.DateTime, nullable=False)
    acceptance_deadline = db.Column(db.DateTime, nullable=False)
    offer_letter_path = db.Column(db.String(256), nullable=False)
    status = db.Column(db.String(16), nullable=False, default='PENDING', index=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(pytz.timezone('Asia/Kolkata')))
    @validates("joining_date", "acceptance_deadline")
    def validate(self, key, value):
        if value:
            dt_val = value
            if isinstance(dt_val, str):
                try:
                    dt_val = datetime.strptime(dt_val, '%Y-%m-%d %H:%M')
                except ValueError:
                    try:
                        dt_val = datetime.strptime(dt_val, '%Y-%m-%d')
                    except ValueError:
                        pass
            
            if isinstance(dt_val, datetime):
                now = datetime.now(dt_val.tzinfo) if getattr(dt_val, 'tzinfo', None) else datetime.now()
                if dt_val < now - timedelta(minutes=5):
                    raise ValueError(f"{key.replace('_', ' ').capitalize()} must be in the future")
                
            if key == "joining_date" and self.acceptance_deadline and value < self.acceptance_deadline:
                raise ValueError("Joining date must be after acceptance deadline")
            elif key == "acceptance_deadline" and self.joining_date and value > self.joining_date:
                raise ValueError("Acceptance deadline must be before joining date")
        return value

    application = db.relationship('Application', backref=db.backref('placement', cascade='all, delete-orphan', uselist=False), lazy=True)

class Notification(db.Model):
    __tablename__ = 'notifications'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    message = db.Column(db.String(256), nullable=False)
    is_read = db.Column(db.Boolean, nullable=False, default=False)
    notification_type = db.Column(db.String(16), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(pytz.timezone('Asia/Kolkata')))

    user = db.relationship('User', backref=db.backref('notifications', cascade='all, delete-orphan'), lazy=True)

class Interview(db.Model):
    __tablename__ = 'interviews'
    id = db.Column(db.Integer, primary_key=True)
    application_id = db.Column(db.Integer, db.ForeignKey('applications.id', ondelete='CASCADE'), nullable=False, index=True)
    start_time = db.Column(db.DateTime, nullable=False)
    duration = db.Column(db.Integer, nullable=False)
    location = db.Column(db.String(32), nullable=False)
    status = db.Column(db.String(16), nullable=False, default='PENDING', index=True)
    meeting_link = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(pytz.timezone('Asia/Kolkata')))
    @validates("start_time", "duration")
    def validate(self, key, value):
        if value is not None:
            if key == "start_time":
                dt_val = value
                if isinstance(dt_val, str):
                    try:
                        dt_val = datetime.strptime(dt_val, '%Y-%m-%d %H:%M')
                    except ValueError:
                        pass
                if isinstance(dt_val, datetime):
                    now = datetime.now(dt_val.tzinfo) if getattr(dt_val, 'tzinfo', None) else datetime.now()
                    if dt_val < now - timedelta(minutes=5):
                        raise ValueError("Start time must be in the future")
            elif key == "duration":
                if value <= 0:
                    raise ValueError("Duration must be a positive integer")
        return value

    application = db.relationship('Application', backref=db.backref('interviews', cascade='all, delete-orphan'), lazy=True)
