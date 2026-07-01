from celery import shared_task
from backend.models import User, Company, Student, Drive, Position, Application, Placement, Interview, db
from backend.extensions import mail
from flask_mail import Message
from datetime import datetime, timedelta
import pytz
import os
import csv
from io import StringIO
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from flask import current_app

@shared_task
def send_daily_interview_reminders():
    tz = pytz.timezone('Asia/Kolkata')
    now = datetime.now(tz)
    tomorrow_start = now + timedelta(days=1)
    tomorrow_start = tomorrow_start.replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow_end = tomorrow_start + timedelta(days=1)

    interviews = Interview.query.filter(
        Interview.status == 'PENDING',
        Interview.start_time >= tomorrow_start,
        Interview.start_time < tomorrow_end
    ).all()

    sent_count = 0
    for interview in interviews:
        student = interview.application.student
        company = interview.application.position.drive.company
        position = interview.application.position
        
        msg = Message(
            subject=f"Reminder: Upcoming Interview for {position.position_name} at {company.company_name}",
            recipients=[student.user.email]
        )
        time_str = interview.start_time.strftime('%I:%M %p')
        date_str = interview.start_time.strftime('%d/%m/%Y')
        msg.body = f"""Dear {student.full_name},

This is a reminder that you have an interview scheduled for the position of {position.position_name} at {company.company_name}.

Date: {date_str}
Time: {time_str}
Location: {interview.location}
Meeting Link: {interview.meeting_link or 'N/A'}

Best regards,
Placement Portal Team"""
        try:
            mail.send(msg)
            sent_count += 1
        except Exception as e:
            print(f"Error sending email to {student.user.email}: {e}")
            
    return f"Sent {sent_count} daily reminders"


@shared_task
def send_hourly_interview_reminders():
    tz = pytz.timezone('Asia/Kolkata')
    now = datetime.now(tz)
    one_hour_from_now = now + timedelta(hours=1)
    two_hours_from_now = now + timedelta(hours=2)

    interviews = Interview.query.filter(
        Interview.status == 'PENDING',
        Interview.start_time >= one_hour_from_now,
        Interview.start_time < two_hours_from_now
    ).all()

    sent_count = 0
    for interview in interviews:
        student = interview.application.student
        company = interview.application.position.drive.company
        position = interview.application.position
        
        msg = Message(
            subject=f"URGENT Reminder: Interview starting soon for {position.position_name}",
            recipients=[student.user.email]
        )
        time_str = interview.start_time.strftime('%I:%M %p')
        msg.body = f"""Dear {student.full_name},

Your interview for {position.position_name} at {company.company_name} is starting soon!

Time: {time_str}
Location: {interview.location}
Meeting Link: {interview.meeting_link or 'N/A'}

Please be ready 5 minutes early. Good luck!

Best regards,
Placement Portal Team"""
        try:
            mail.send(msg)
            sent_count += 1
        except Exception as e:
            print(f"Error sending email to {student.user.email}: {e}")
            
    return f"Sent {sent_count} hourly reminders"


@shared_task
def generate_monthly_company_reports():
    companies = Company.query.filter_by(approval_status='APPROVED').all()
    
    tz = pytz.timezone('Asia/Kolkata')
    now = datetime.now(tz)
    month_name = now.strftime('%B %Y')
    
    static_folder = current_app.static_folder or os.path.join(os.getcwd(), 'frontend')
    reports_dir = os.path.join(static_folder, 'uploads', 'reports')
    os.makedirs(reports_dir, exist_ok=True)
    
    sent_count = 0
    for company in companies:
        filename = f"monthly_report_{company.id}_{now.strftime('%Y%m')}.pdf"
        file_path = os.path.join(reports_dir, filename)
        
        doc = SimpleDocTemplate(file_path, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
        story = []
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle('DocTitle', parent=styles['Heading1'], alignment=1, spaceAfter=20)
        body_style = ParagraphStyle('DocBody', parent=styles['Normal'], spaceAfter=10)
        
        story.append(Paragraph(f"Monthly Placement Report - {month_name}", title_style))
        story.append(Paragraph(f"Company: {company.company_name}", body_style))
        story.append(Spacer(1, 15))
        
        drives = Drive.query.filter_by(company_id=company.id).all()
        total_drives = len(drives)
        total_positions = sum(len(d.positions) for d in drives)
        
        story.append(Paragraph(f"Total Drives: {total_drives}", body_style))
        story.append(Paragraph(f"Total Positions: {total_positions}", body_style))
        story.append(Spacer(1, 15))
        
        # Build stats per drive
        for drive in drives:
            story.append(Paragraph(f"<b>Drive: {drive.drive_name}</b>", body_style))
            for pos in drive.positions:
                apps = Application.query.filter_by(position_id=pos.id).all()
                shortlisted = len([a for a in apps if a.status in ['SHORTLISTED', 'INTERVIEW', 'PLACED']])
                placed = len([a for a in apps if a.status == 'PLACED'])
                data = [
                    [Paragraph("Position", body_style), Paragraph("Total Applicants", body_style), Paragraph("Shortlisted", body_style), Paragraph("Placed", body_style)],
                    [Paragraph(pos.position_name, body_style), str(len(apps)), str(shortlisted), str(placed)]
                ]
                t = Table(data, colWidths=[150, 100, 100, 100])
                t.setStyle(TableStyle([
                    ('BACKGROUND', (0,0), (-1,0), colors.lightgrey),
                    ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
                    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ]))
                story.append(t)
                story.append(Spacer(1, 10))
                
        doc.build(story)
        
        # Email the report to company HR
        msg = Message(
            subject=f"Placement Portal Monthly Report - {month_name}",
            recipients=[company.user.email]
        )
        msg.body = f"Dear HR Team,\n\nPlease find attached your monthly placement report for {month_name}.\n\nBest regards,\nPlacement Portal Team"
        with current_app.open_resource(file_path) as fp:
            msg.attach(filename, "application/pdf", fp.read())
            
        try:
            mail.send(msg)
            sent_count += 1
        except Exception as e:
            print(f"Error sending report to {company.user.email}: {e}")
            
    return f"Sent {sent_count} monthly reports"


@shared_task
def export_application_history(user_id, role, email):
    csv_filename = f"export_{role.lower()}_{user_id}_{int(datetime.now().timestamp())}.csv"
    static_folder = current_app.static_folder or os.path.join(os.getcwd(), 'frontend')
    exports_dir = os.path.join(static_folder, 'uploads', 'exports')
    os.makedirs(exports_dir, exist_ok=True)
    
    file_path = os.path.join(exports_dir, csv_filename)
    
    if role == 'STUDENT':
        student = Student.query.filter_by(user_id=user_id).first()
        apps = Application.query.filter_by(student_id=student.id).all()
        
        with open(file_path, mode='w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['Company', 'Position', 'Applied At', 'Status', 'Feedback'])
            for a in apps:
                applied_at = a.applied_at.strftime('%Y-%m-%d %H:%M') if a.applied_at else ''
                writer.writerow([
                    a.position.drive.company.company_name,
                    a.position.position_name,
                    applied_at,
                    a.status,
                    a.feedback or ''
                ])
                
    elif role == 'COMPANY':
        company = Company.query.filter_by(user_id=user_id).first()
        apps = Application.query.join(Position).join(Drive).filter(Drive.company_id == company.id).all()
        
        with open(file_path, mode='w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['Student Name', 'Branch', 'Position', 'Applied At', 'Status'])
            for a in apps:
                applied_at = a.applied_at.strftime('%Y-%m-%d %H:%M') if a.applied_at else ''
                writer.writerow([
                    a.student.full_name,
                    a.student.branch,
                    a.position.position_name,
                    applied_at,
                    a.status
                ])
    else:
        return "Invalid role for export"
        
    # Email the CSV
    msg = Message(
        subject="Your Requested Data Export",
        recipients=[email]
    )
    msg.body = "Hello,\n\nYour requested data export has been completed successfully. Please find the CSV file attached.\n\nBest regards,\nPlacement Portal Team"
    with current_app.open_resource(file_path) as fp:
        msg.attach(csv_filename, "text/csv", fp.read())
        
    try:
        mail.send(msg)
    except Exception as e:
        print(f"Error sending export to {email}: {e}")
        return f"Failed to send email to {email}"
        
    return f"/uploads/exports/{csv_filename}"

@shared_task
def send_status_update_email(student_email, student_name, position_name, company_name, status, feedback=""):
    subject = f"Application Status Update: {company_name}"
    
    if status == 'APPLIED':
        body = f"Dear {student_name},\n\nYour application for {position_name} at {company_name} has been received successfully.\n\nBest regards,\nPlacement Portal Team"
    elif status == 'SHORTLISTED':
        body = f"Dear {student_name},\n\nCongratulations! You have been shortlisted for {position_name} at {company_name}.\n\nBest regards,\nPlacement Portal Team"
    elif status == 'INTERVIEW':
        body = f"Dear {student_name},\n\nAn interview has been scheduled for {position_name} at {company_name}. Please check your dashboard for details.\n\nBest regards,\nPlacement Portal Team"
    elif status == 'PLACED':
        body = f"Dear {student_name},\n\nCongratulations! You have been selected for {position_name} at {company_name}.\n\nBest regards,\nPlacement Portal Team"
    elif status == 'REJECTED':
        body = f"Dear {student_name},\n\nWe regret to inform you that you were not selected for {position_name} at {company_name}.\n"
        if feedback:
            body += f"Feedback: {feedback}\n"
        body += "\nBest regards,\nPlacement Portal Team"
    else:
        body = f"Dear {student_name},\n\nYour application status for {position_name} at {company_name} is now: {status}.\n\nBest regards,\nPlacement Portal Team"

    msg = Message(subject=subject, recipients=[student_email])
    msg.body = body

    try:
        mail.send(msg)
        return f"Sent status update email to {student_email}"
    except Exception as e:
        print(f"Error sending email to {student_email}: {e}")
        
        # Fallback to default sender
        fallback_email = current_app.config.get('MAIL_DEFAULT_SENDER')
        if fallback_email:
            try:
                fallback_msg = Message(subject=f"[FALLBACK] {subject}", recipients=[fallback_email])
                fallback_msg.body = f"Original delivery to {student_email} failed.\n\nOriginal Message:\n{body}"
                mail.send(fallback_msg)
                return f"Sent fallback status update email to {fallback_email}"
            except Exception as inner_e:
                print(f"Fallback email failed: {inner_e}")
                return "Failed to send both original and fallback emails."
        return "Failed to send email and no fallback configured."
