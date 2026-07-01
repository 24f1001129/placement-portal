# Placement Portal Application (PPA)

## Overview
This is the repository for the Placement Portal Application, built with Flask and Vue.js.

## Getting Started

### Backend Setup
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
