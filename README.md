# Placement Portal Application

A web-based placement management system that connects students, recruiters, and college administrators in one place. Students can browse and apply for placement drives, recruiters can post drives and manage applicants, and admins can oversee the entire placement process.

## How It Works

The portal has three types of users — **Students**, **Companies**, and **Admins**. Each gets their own dashboard after logging in.

- **Students** sign up, fill in their profile (branch, CGPA, resume, etc.), and then browse available placement drives. They can apply to positions, track their application status, view scheduled interviews, and download offer letters if they get placed.
- **Companies** register and create placement drives with one or more job positions. Once their drive is approved by an admin, students can start applying. Recruiters can then shortlist or reject applicants, schedule interviews with meeting links, and finally extend job offers to selected candidates.
- **Admins** have full visibility. They approve or reject company-submitted drives, manage all user accounts, and view analytics charts that show placement statistics across the college.

Background tasks like sending emails, generating offer letter PDFs, and exporting data to CSV are handled asynchronously using Celery and Redis, so the main app stays fast and responsive.

## Features

- Role-based authentication (Student, Company, Admin) with session management
- Student profile management with resume uploads (GitHub, LinkedIn, etc.)
- Company placement drive creation with multiple positions per drive
- Admin approval workflow for drives before they go live
- Application tracking with status pipeline (Applied → Shortlisted → Interview → Placed)
- Interview scheduling with date, time, location, and meeting link support
- Automated offer letter PDF generation upon placement
- Background task processing (emails, exports, PDFs) via Celery + Redis
- Data export to CSV for recruiters
- Analytics dashboards with Chart.js visualizations
- Dark mode support across all dashboards
- API response caching for better performance
- Color-coded status badges and deadline-aware UI

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python, Flask, SQLAlchemy ORM |
| Frontend | Vue.js 3 (CDN), Bootstrap 5 |
| Database | SQLite |
| Task Queue | Celery with Redis as the message broker |
| Charts | Chart.js |
| PDF Generation | ReportLab |
| Caching | Flask-Caching |

## Getting Started

1. Install dependencies:
   ```shell
   pip install -r requirements.txt
   ```
2. Start the Flask application:
   ```shell
   python app.py
   ```
3. Open a **new, second terminal** and start the Celery worker:
   ```shell
   celery -A celery_worker.celery worker --loglevel=info --pool=solo
   ```
4. Open a **third terminal** and start the Celery Beat scheduler:
   ```shell
   celery -A celery_worker.celery beat --loglevel=info
   ```
5. Open `http://localhost:5000` in your browser.

## Future Scope

1. **Multi-Round Interview Pipelines** — Support staged hiring flows like Online Assessment → Technical Round → HR Round, instead of a single interview step.
2. **Real-time Notifications** — Use WebSockets to instantly alert students when they get shortlisted, an interview is scheduled, or an offer is extended — no page refresh needed.
3. **AI-based Resume Screening** — Let recruiters set keywords and auto-score applicants with a "Match %" so the best candidates float to the top.
4. **Docker Containerization & CI/CD** — Package the entire app (Flask, Celery, Redis, DB) into Docker containers with automated GitHub Actions pipelines for testing and deployment.
5. **Placement Prediction Analytics** — Use historical placement data (CGPA, branch, backlogs) to flag at-risk students early so the placement cell can provide targeted support.