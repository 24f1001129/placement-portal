export default {
  name: 'CompanyDashboard',
  props: {
    user: Object,
    currentRoute: String
  },
  emits: ['navigate'],
  watch: {
    currentRoute(newRoute) {
      this.syncTabWithRoute(newRoute);
    }
  },
  data() {
    return {
      activeTab: 'overview', // overview, drives, applicants, interviews
      drives: [],
      applications: [],
      interviews: [],

      // New Drive Form
      newDrive: {
        drive_name: '',
        description: '',
        deadline: '',
        eligible_year: null,
        positions: [
          {
            position_name: '',
            description: '',
            min_cgpa: 6.0,
            branches: '',
            salary: null,
            skills: '',
            location: '',
            mode: 'On-site'
          }
        ]
      },
      editingDriveId: null,

      // Filtering / Action states
      selectedPositionFilter: '',
      actionAppId: null,
      actionStatus: '', // SHORTLISTED or REJECTED
      actionFeedback: '',

      interviewAppId: null,
      newInterview: {
        start_time: '',
        duration: 30,
        location: '',
        meeting_link: ''
      },

      selectAppId: null,
      joiningDate: '',
      acceptanceDeadline: '',

      error: '',
      success: '',
      loading: false,
      exportPolling: null
    }
  },
  computed: {
    filteredApplications() {
      if (!this.selectedPositionFilter) return this.applications;
      return this.applications.filter(a => a.position.id == this.selectedPositionFilter);
    },
    uniquePositions() {
      const seen = new Set();
      const list = [];
      for (const a of this.applications) {
        if (!seen.has(a.position.id)) {
          seen.add(a.position.id);
          list.push(a.position);
        }
      }
      return list;
    }
  },
  methods: {
    syncTabWithRoute(route) {
      if (route === '/company/drives') this.switchTab('drives');
      else if (route === '/company/applicants') this.switchTab('applicants');
      else if (route === '/company/interviews') this.switchTab('interviews');
      else this.switchTab('overview');
    },
    clearMessages() {
      this.error = '';
      this.success = '';
    },
    async fetchDrives() {
      this.loading = true;
      try {
        const res = await fetch('/company/drives');
        if (res.ok) {
          const data = await res.json();
          this.drives = data.drives;
        } else {
          this.error = 'Failed to fetch drives.';
        }
      } catch (err) {
        this.error = 'Network error fetching drives.';
      } finally {
        this.loading = false;
      }
    },
    async fetchApplications() {
      this.loading = true;
      try {
        const res = await fetch('/company/applications');
        if (res.ok) {
          const data = await res.json();
          this.applications = data.applications;
        } else {
          this.error = 'Failed to fetch applications.';
        }
      } catch (err) {
        this.error = 'Network error fetching applications.';
      } finally {
        this.loading = false;
      }
    },
    async fetchInterviews() {
      this.loading = true;
      try {
        const res = await fetch('/company/interviews');
        if (res.ok) {
          const data = await res.json();
          this.interviews = data.interviews;
        } else {
          this.error = 'Failed to fetch interviews.';
        }
      } catch (err) {
        this.error = 'Network error fetching interviews.';
      } finally {
        this.loading = false;
      }
    },
    addPositionForm() {
      this.newDrive.positions.push({
        position_name: '',
        description: '',
        min_cgpa: 6.0,
        branches: '',
        salary: null,
        skills: '',
        location: '',
        mode: 'On-site'
      });
    },
    removePositionForm(index) {
      if (this.newDrive.positions.length > 1) {
        this.newDrive.positions.splice(index, 1);
      }
    },
    startEditDrive(drive) {
      this.clearMessages();
      this.editingDriveId = drive.id;
      
      let formattedDeadline = '';
      if (drive.raw_deadline) {
        formattedDeadline = drive.raw_deadline.replace(' ', 'T');
      }

      this.newDrive = {
        drive_name: drive.drive_name,
        description: drive.description,
        eligible_year: drive.eligible_year,
        deadline: formattedDeadline,
        positions: drive.positions.map(p => ({
          id: p.id,
          position_name: p.position_name,
          description: p.description,
          min_cgpa: p.min_cgpa,
          branches: p.branches,
          salary: p.raw_salary,
          skills: p.skills,
          location: p.location,
          mode: p.mode
        }))
      };
    },
    cancelEditDrive() {
      this.editingDriveId = null;
      this.resetDriveForm();
    },
    resetDriveForm() {
      this.newDrive = {
        drive_name: '',
        description: '',
        deadline: '',
        eligible_year: null,
        positions: [
          {
            position_name: '',
            description: '',
            min_cgpa: 6.0,
            branches: '',
            salary: null,
            skills: '',
            location: '',
            mode: 'On-site'
          }
        ]
      };
    },
    async submitDrive() {
      this.clearMessages();
      this.loading = true;

      const payload = {
        ...this.newDrive,
        deadline: this.newDrive.deadline ? this.newDrive.deadline.replace('T', ' ') : ''
      };

      const url = this.editingDriveId ? `/company/drives/${this.editingDriveId}` : '/company/drives';
      const method = this.editingDriveId ? 'PUT' : 'POST';

      try {
        const res = await fetch(url, {
          method: method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
          this.success = data.message;
          this.editingDriveId = null;
          this.resetDriveForm();
          this.fetchDrives();
        } else {
          this.error = data.error || 'Failed to submit drive.';
        }
      } catch (err) {
        this.error = 'Network error. Failed to submit drive.';
      } finally {
        this.loading = false;
      }
    },
    async deleteDrive(driveId) {
      if (!confirm('Are you sure you want to delete this drive?')) return;
      this.clearMessages();
      this.loading = true;
      try {
        const res = await fetch(`/company/drives/${driveId}`, {
          method: 'DELETE'
        });
        const data = await res.json();
        if (res.ok) {
          this.success = 'Drive deleted successfully.';
          this.fetchDrives();
          if (this.editingDriveId === driveId) {
            this.cancelEditDrive();
          }
        } else {
          this.error = data.error || 'Failed to delete drive.';
        }
      } catch (err) {
        this.error = 'Network error. Failed to delete drive.';
      } finally {
        this.loading = false;
      }
    },
    openStatusModal(appId, status) {
      this.actionAppId = appId;
      this.actionStatus = status;
      this.actionFeedback = '';
      this.clearMessages();
    },
    async submitStatusUpdate() {
      if (!this.actionAppId || !this.actionStatus) return;
      this.loading = true;
      try {
        const res = await fetch(`/company/applications/${this.actionAppId}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: this.actionStatus,
            feedback: this.actionFeedback
          })
        });
        const data = await res.json();
        if (res.ok) {
          this.success = `Application successfully ${this.actionStatus.toLowerCase()}.`;
          this.actionAppId = null;
          this.fetchApplications();
        } else {
          this.error = data.error || 'Failed to update application status.';
        }
      } catch (err) {
        this.error = 'Network error updating candidate status.';
      } finally {
        this.loading = false;
      }
    },
    openInterviewForm(appId) {
      this.interviewAppId = appId;
      this.newInterview = {
        start_time: '',
        duration: 30,
        location: '',
        meeting_link: ''
      };
      this.clearMessages();
    },
    async submitInterview() {
      if (!this.interviewAppId) return;
      this.loading = true;
      
      const payload = {
        application_id: this.interviewAppId,
        ...this.newInterview,
        start_time: this.newInterview.start_time ? this.newInterview.start_time.replace('T', ' ') : ''
      };

      try {
        const res = await fetch('/company/interviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
          this.success = 'Interview scheduled and candidate status updated.';
          this.interviewAppId = null;
          this.fetchApplications();
        } else {
          this.error = data.error || 'Failed to schedule interview.';
        }
      } catch (err) {
        this.error = 'Network error scheduling interview.';
      } finally {
        this.loading = false;
      }
    },
    openSelectionForm(appId) {
      this.selectAppId = appId;
      this.joiningDate = '';
      this.acceptanceDeadline = '';
      this.clearMessages();
    },
    async submitSelection() {
      if (!this.selectAppId || !this.joiningDate || !this.acceptanceDeadline) return;
      this.loading = true;
      try {
        const res = await fetch(`/company/applications/${this.selectAppId}/select`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            joining_date: this.joiningDate,
            acceptance_deadline: this.acceptanceDeadline.replace('T', ' ')
          })
        });
        const data = await res.json();
        if (res.ok) {
          this.success = 'Candidate selected successfully! Offer letter generated.';
          this.selectAppId = null;
          this.fetchApplications();
        } else {
          this.error = data.error || 'Failed to select candidate.';
        }
      } catch (err) {
        this.error = 'Network error. Failed to select candidate.';
      } finally {
        this.loading = false;
      }
    },
    switchTab(tab) {
      this.activeTab = tab;
      this.clearMessages();
      if (tab === 'drives') this.fetchDrives();
      else if (tab === 'applicants') this.fetchApplications();
      else if (tab === 'interviews') this.fetchInterviews();
    },
    async exportData() {
      this.clearMessages();
      try {
        const res = await fetch('/company/export', { method: 'POST' });
        const result = await res.json();
        if (res.ok) {
          this.success = 'Data export started. You will be notified when it completes.';
          this.startPolling(result.task_id);
        } else {
          this.error = result.error || 'Failed to start data export.';
        }
      } catch (err) {
        this.error = 'Network error starting export.';
      }
    },
    startPolling(taskId) {
      if (this.exportPolling) clearInterval(this.exportPolling);
      this.exportPolling = setInterval(async () => {
        try {
          const res = await fetch(`/auth/tasks/${taskId}/status`);
          if (!res.ok) return;
          const data = await res.json();
          if (data.task_status === 'SUCCESS') {
            clearInterval(this.exportPolling);
            this.success = 'Data export successful! An email has been sent with the CSV file attached.';
          } else if (data.task_status === 'FAILURE') {
            clearInterval(this.exportPolling);
            this.error = 'Data export failed during generation.';
          }
        } catch (e) {
          console.error('Polling error', e);
        }
      }, 2000);
    }
  },
  unmounted() {
    if (this.exportPolling) clearInterval(this.exportPolling);
  },
  created() {
    this.syncTabWithRoute(this.currentRoute);
  },
  template: `
    <div class="container my-4">
      <div class="row mb-3">
        <div class="col d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div>
            <h2 class="fw-light">Recruiter Dashboard</h2>
            <p class="text-muted small">Post placement drives and manage applications and interviews.</p>
          </div>
          <button class="btn btn-sm btn-outline-dark" @click="exportData()">
            Export Data
          </button>
        </div>
      </div>

      <!-- Navigation Tabs (Minimal Design) -->
      <ul class="nav nav-tabs mb-4 border-bottom-0">
        <li class="nav-item">
          <button class="nav-link border-0" :class="{ 'fw-bold text-dark border-bottom border-dark border-2': activeTab === 'overview', 'text-muted': activeTab !== 'overview' }" @click="switchTab('overview')">Overview</button>
        </li>
        <li class="nav-item">
          <button class="nav-link border-0" :class="{ 'fw-bold text-dark border-bottom border-dark border-2': activeTab === 'drives', 'text-muted': activeTab !== 'drives' }" @click="switchTab('drives')">Placement Drives</button>
        </li>
        <li class="nav-item">
          <button class="nav-link border-0" :class="{ 'fw-bold text-dark border-bottom border-dark border-2': activeTab === 'applicants', 'text-muted': activeTab !== 'applicants' }" @click="switchTab('applicants')">Applicants</button>
        </li>
        <li class="nav-item">
          <button class="nav-link border-0" :class="{ 'fw-bold text-dark border-bottom border-dark border-2': activeTab === 'interviews', 'text-muted': activeTab !== 'interviews' }" @click="switchTab('interviews')">Interviews</button>
        </li>
      </ul>

      <!-- Alerts -->
      <div v-if="error" class="alert alert-danger py-2 px-3 mb-3 small rounded-0 border-0 bg-danger-subtle">{{ error }}</div>
      <div v-if="success" class="alert alert-success py-2 px-3 mb-3 small rounded-0 border-0 bg-success-subtle">{{ success }}</div>

      <!-- Overview Tab -->
      <div v-if="activeTab === 'overview'" class="row g-3">
        <div class="col-md-12">
          <div class="border p-4 bg-light">
            <h4 class="fw-normal mb-3">Welcome, {{ user?.name }}</h4>
            <p class="text-muted small">You are logged in as a verified recruiter. Please use the navigation tabs to configure placement events.</p>
            <div class="mt-4 pt-2 border-top">
              <span class="small text-muted">Contact email: {{ user?.email }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Drives Tab -->
      <div v-else-if="activeTab === 'drives'">
        <div class="row g-4">
          <!-- Left side: List drives -->
          <div class="col-lg-6">
            <h5 class="fw-normal mb-3">Your Placement Drives</h5>
            <div v-for="d in drives" :key="d.id" class="border p-3 mb-3 bg-light">
              <div class="d-flex justify-content-between align-items-start">
                <h6 class="mb-1">{{ d.drive_name }}</h6>
                <span class="badge rounded-0 py-1" :class="d.status === 'APPROVED' ? 'bg-success-subtle text-success border border-success' : (d.status === 'REJECTED' ? 'bg-danger-subtle text-danger border border-danger' : 'bg-warning-subtle text-warning border border-warning')">
                  {{ d.status }}
                </span>
              </div>
              <p class="text-muted small mb-2">{{ d.description }}</p>
              <div class="small text-muted mb-2">
                <span>Eligible Graduation Year: <strong>{{ d.eligible_year }}</strong></span><br>
                <span>Application Deadline: {{ d.deadline }}</span>
              </div>
              
              <div v-if="d.status === 'PENDING'" class="mt-2 d-flex gap-2 border-top pt-2">
                <button type="button" class="btn btn-xs btn-outline-dark rounded-0 py-0.5 px-2" style="font-size: 0.75rem;" @click="startEditDrive(d)">Edit</button>
                <button type="button" class="btn btn-xs btn-outline-danger rounded-0 py-0.5 px-2" style="font-size: 0.75rem;" @click="deleteDrive(d.id)">Delete</button>
              </div>
              
              <div class="mt-3 border-top pt-2">
                <span class="small fw-semibold d-block mb-1">Job Positions:</span>
                <ul class="list-unstyled mb-0 ps-1">
                  <li v-for="pos in d.positions" :key="pos.id" class="small py-1 border-bottom border-light">
                    <strong>{{ pos.position_name }}</strong> (INR {{ pos.salary }}/yr) <br>
                    <span class="text-muted">Eligible: {{ pos.branches }} | Min CGPA: {{ pos.min_cgpa }}</span>
                  </li>
                </ul>
              </div>
            </div>
            <div v-if="drives.length === 0" class="text-muted small py-4 text-center border bg-light">
              No placement drives registered yet.
            </div>
          </div>

          <!-- Right side: Create/Edit drive form -->
          <div class="col-lg-6">
            <form @submit.prevent="submitDrive" class="border p-4 bg-light">
              <h5 class="fw-normal mb-3">{{ editingDriveId ? 'Edit Placement Drive' : 'Create Placement Drive' }}</h5>
              
              <div class="mb-3">
                <label class="form-label small text-muted">Drive Title / Job Role Group</label>
                <input type="text" v-model="newDrive.drive_name" class="form-control form-control-sm rounded-0" placeholder="e.g. Google Engineering Drive 2026" required>
              </div>
              <div class="mb-3">
                <label class="form-label small text-muted">General Description</label>
                <textarea v-model="newDrive.description" rows="2" class="form-control form-control-sm rounded-0" placeholder="General recruitment process details..." required></textarea>
              </div>
              <div class="row mb-3">
                <div class="col-md-6">
                  <label class="form-label small text-muted">Eligible Grad Year</label>
                  <input type="number" v-model="newDrive.eligible_year" class="form-control form-control-sm rounded-0" placeholder="e.g. 2026" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label small text-muted">Deadline (Date & Time)</label>
                  <input type="datetime-local" v-model="newDrive.deadline" class="form-control form-control-sm rounded-0" required>
                </div>
              </div>

              <!-- Positions list -->
              <h6 class="fw-normal mt-4 mb-2 pb-1 border-bottom">Positions Under Drive</h6>
              <div v-for="(pos, index) in newDrive.positions" :key="index" class="border p-3 mb-3 bg-white">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <span class="small fw-semibold text-muted">Position #{{ index + 1 }}</span>
                  <button v-if="newDrive.positions.length > 1" type="button" class="btn btn-xs btn-outline-danger py-0 px-2 rounded-0" style="font-size: 0.75rem;" @click="removePositionForm(index)">Remove</button>
                </div>
                
                <div class="mb-2">
                  <label class="form-label small text-muted mb-1" style="font-size: 0.75rem;">Position Name</label>
                  <input type="text" v-model="pos.position_name" class="form-control form-control-sm rounded-0" placeholder="e.g. Software Engineer" required>
                </div>
                
                <div class="row g-2 mb-2">
                  <div class="col-md-6">
                    <label class="form-label small text-muted mb-1" style="font-size: 0.75rem;">Min CGPA (5.0 - 10.0)</label>
                    <input type="number" step="0.1" v-model="pos.min_cgpa" class="form-control form-control-sm rounded-0" required>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label small text-muted mb-1" style="font-size: 0.75rem;">Salary (INR/yr)</label>
                    <input type="number" v-model="pos.salary" class="form-control form-control-sm rounded-0" placeholder="e.g. 1200000" required>
                  </div>
                </div>

                <div class="mb-2">
                  <label class="form-label small text-muted mb-1" style="font-size: 0.75rem;">Eligible Branches</label>
                  <input type="text" v-model="pos.branches" class="form-control form-control-sm rounded-0" placeholder="Computer Science, Data Science" required>
                </div>

                <div class="mb-2">
                  <label class="form-label small text-muted mb-1" style="font-size: 0.75rem;">Required Skills (comma separated)</label>
                  <input type="text" v-model="pos.skills" class="form-control form-control-sm rounded-0" placeholder="Python, SQL, Algorithms" required>
                </div>

                <div class="row g-2 mb-2">
                  <div class="col-md-6">
                    <label class="form-label small text-muted mb-1" style="font-size: 0.75rem;">Location</label>
                    <input type="text" v-model="pos.location" class="form-control form-control-sm rounded-0" placeholder="e.g. Bangalore, IN" required>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label small text-muted mb-1" style="font-size: 0.75rem;">Mode</label>
                    <select v-model="pos.mode" class="form-select form-select-sm rounded-0">
                      <option value="On-site">On-site</option>
                      <option value="Remote">Remote</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>
                </div>

                <div class="mb-1">
                  <label class="form-label small text-muted mb-1" style="font-size: 0.75rem;">Job Description</label>
                  <textarea v-model="pos.description" rows="2" class="form-control form-control-sm rounded-0" placeholder="Details about specific responsibilities..." required></textarea>
                </div>
              </div>

              <div class="d-flex justify-content-between mt-3">
                <div>
                  <button type="button" class="btn btn-sm btn-outline-secondary rounded-0 me-2" @click="addPositionForm">Add Another Position</button>
                  <button v-if="editingDriveId" type="button" class="btn btn-sm btn-outline-danger rounded-0" @click="cancelEditDrive">Cancel Edit</button>
                </div>
                <button type="submit" class="btn btn-sm btn-dark rounded-0 px-4" :disabled="loading">
                  {{ editingDriveId ? 'Save Changes' : 'Submit Drive Proposal' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Applicants Tab -->
      <div v-else-if="activeTab === 'applicants'">
        <!-- Filter dropdown -->
        <div class="row mb-3 align-items-center">
          <div class="col-auto">
            <label class="small text-muted mb-1">Filter by Position:</label>
            <select v-model="selectedPositionFilter" class="form-select form-select-sm rounded-0">
              <option value="">All Positions</option>
              <option v-for="p in uniquePositions" :key="p.id" :value="p.id">{{ p.position_name }} ({{ p.drive_name }})</option>
            </select>
          </div>
        </div>

        <!-- Applicants Table -->
        <div class="table-responsive border bg-light p-3">
          <table class="table table-sm align-middle small table-hover">
            <thead>
              <tr class="border-bottom text-muted">
                <th>Candidate Name</th>
                <th>Applied Role</th>
                <th>Branch & CGPA</th>
                <th>Profile / Resume</th>
                <th>Applied On</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="a in filteredApplications" :key="a.id">
                <td>
                  <strong>{{ a.student.full_name }}</strong><br>
                  <span class="text-muted" style="font-size: 0.75rem;">{{ a.student.phone }}</span>
                </td>
                <td>
                  {{ a.position.position_name }}<br>
                  <span class="text-muted" style="font-size: 0.75rem;">{{ a.position.drive_name }}</span>
                </td>
                <td>
                  <span>{{ a.student.branch }} (Grad: {{ a.student.grad_year }})</span><br>
                  <span class="text-muted">CGPA: {{ a.student.cgpa }}</span>
                </td>
                <td>
                  <div class="d-flex gap-2 flex-wrap">
                    <a :href="a.student.github_url" target="_blank" class="small text-decoration-none text-dark border-bottom border-dark">GitHub</a>
                    <a :href="a.student.linkedin_url" target="_blank" class="small text-decoration-none text-dark border-bottom border-dark">LinkedIn</a>
                    <a v-if="a.student.resume_path" :href="a.student.resume_path" target="_blank" class="small text-decoration-none text-success border-bottom border-success fw-bold">Resume PDF</a>
                    <span v-else class="text-muted small">No Resume</span>
                  </div>
                </td>
                <td>{{ a.applied_at }}</td>
                <td>
                  <span class="badge rounded-0 py-1" :class="a.status === 'PLACED' ? 'bg-success' : (a.status === 'REJECTED' ? 'bg-danger' : (a.status === 'SHORTLISTED' ? 'bg-primary' : (a.status === 'INTERVIEW' ? 'bg-info text-dark' : 'bg-secondary')))">
                    {{ a.status }}
                  </span>
                  <div v-if="a.feedback" class="text-muted small mt-1" style="font-size: 0.75rem;">
                    <em>Feedback: {{ a.feedback }}</em>
                  </div>
                </td>
                <td>
                  <div class="d-flex gap-1 flex-wrap">
                    <!-- Shortlist / Reject Actions -->
                    <template v-if="a.status === 'DRAFT' || a.status === 'APPLIED'">
                      <button class="btn btn-xs btn-outline-dark rounded-0 py-0.5 px-2" style="font-size: 0.75rem;" @click="openStatusModal(a.id, 'SHORTLISTED')">Shortlist</button>
                      <button class="btn btn-xs btn-outline-danger rounded-0 py-0.5 px-2" style="font-size: 0.75rem;" @click="openStatusModal(a.id, 'REJECTED')">Reject</button>
                    </template>

                    <!-- Interview Scheduling Action -->
                    <template v-if="a.status === 'SHORTLISTED'">
                      <button class="btn btn-xs btn-dark rounded-0 py-0.5 px-2" style="font-size: 0.75rem;" @click="openInterviewForm(a.id)">Schedule Interview</button>
                    </template>

                    <!-- Selection/Final Offer Action -->
                    <template v-if="a.status === 'INTERVIEW'">
                      <button class="btn btn-xs btn-success rounded-0 py-0.5 px-2" style="font-size: 0.75rem;" @click="openSelectionForm(a.id)">Offer Job (Select)</button>
                      <button class="btn btn-xs btn-outline-danger rounded-0 py-0.5 px-2" style="font-size: 0.75rem;" @click="openStatusModal(a.id, 'REJECTED')">Reject</button>
                    </template>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredApplications.length === 0">
                <td colspan="7" class="text-center py-4 text-muted">No student applications recorded.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Inline Form Panels for Actions -->
        <div v-if="actionAppId" class="border p-4 bg-light mt-4">
          <h6 class="fw-normal mb-3">Provide Feedback for {{ actionStatus }} Candidate</h6>
          <div class="mb-3">
            <label class="form-label small text-muted">Feedback / Reason</label>
            <textarea v-model="actionFeedback" class="form-control form-control-sm rounded-0" placeholder="Feedback context (optional for shortlisting, recommended for rejection)" rows="3"></textarea>
          </div>
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-dark rounded-0" @click="submitStatusUpdate" :disabled="loading">Submit Decision</button>
            <button class="btn btn-sm btn-outline-secondary rounded-0" @click="actionAppId = null">Cancel</button>
          </div>
        </div>

        <div v-if="interviewAppId" class="border p-4 bg-light mt-4">
          <h6 class="fw-normal mb-3">Schedule Candidate Interview</h6>
          <div class="row g-2 mb-3">
            <div class="col-md-6">
              <label class="form-label small text-muted">Date & Time</label>
              <input type="datetime-local" v-model="newInterview.start_time" class="form-control form-control-sm rounded-0" required>
            </div>
            <div class="col-md-6">
              <label class="form-label small text-muted">Duration (minutes)</label>
              <input type="number" v-model="newInterview.duration" class="form-control form-control-sm rounded-0" required>
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label small text-muted">Location / Meet platform</label>
            <input type="text" v-model="newInterview.location" class="form-control form-control-sm rounded-0" placeholder="e.g. Zoom / Google Meet / Office Room 402" required>
          </div>
          <div class="mb-3">
            <label class="form-label small text-muted">Meeting Link / Address URL (Optional)</label>
            <input type="url" v-model="newInterview.meeting_link" class="form-control form-control-sm rounded-0" placeholder="https://meet.google.com/abc-defg-hij">
          </div>
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-dark rounded-0" @click="submitInterview" :disabled="loading">Schedule Interview</button>
            <button class="btn btn-sm btn-outline-secondary rounded-0" @click="interviewAppId = null">Cancel</button>
          </div>
        </div>

        <div v-if="selectAppId" class="border p-4 bg-light mt-4">
          <h6 class="fw-normal mb-3">Process Final Placement Selection</h6>
          <p class="small text-muted mb-3">Selecting this candidate will automatically generate their offer letter and place them in the company system.</p>
          <div class="row g-2 mb-3">
            <div class="col-md-6">
              <label class="form-label small text-muted">Expected Joining Date</label>
              <input type="date" v-model="joiningDate" class="form-control form-control-sm rounded-0" required>
            </div>
            <div class="col-md-6">
              <label class="form-label small text-muted">Offer Acceptance Deadline</label>
              <input type="datetime-local" v-model="acceptanceDeadline" class="form-control form-control-sm rounded-0" required>
            </div>
          </div>
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-success rounded-0" @click="submitSelection" :disabled="loading">Select & Offer Job</button>
            <button class="btn btn-sm btn-outline-secondary rounded-0" @click="selectAppId = null">Cancel</button>
          </div>
        </div>
      </div>

      <!-- Interviews Tab -->
      <div v-else-if="activeTab === 'interviews'">
        <h5 class="fw-normal mb-3">Scheduled Recruitment Interviews</h5>
        <div class="table-responsive border bg-light p-3">
          <table class="table table-sm align-middle small table-hover">
            <thead>
              <tr class="border-bottom text-muted">
                <th>Student Name</th>
                <th>Position</th>
                <th>Time & Date</th>
                <th>Duration</th>
                <th>Location / Platform</th>
                <th>Meeting URL</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="i in interviews" :key="i.id">
                <td><strong>{{ i.student_name }}</strong></td>
                <td>{{ i.position_name }}</td>
                <td>{{ i.start_time }}</td>
                <td>{{ i.duration }} mins</td>
                <td>{{ i.location }}</td>
                <td>
                  <a v-if="i.meeting_link" :href="i.meeting_link" target="_blank" class="small text-decoration-none text-dark border-bottom border-dark">Join Meet</a>
                  <span v-else class="text-muted small">None</span>
                </td>
                <td>
                  <span class="badge rounded-0 py-1" :class="i.status === 'COMPLETED' ? 'bg-secondary' : 'bg-primary'">
                    {{ i.status }}
                  </span>
                </td>
              </tr>
              <tr v-if="interviews.length === 0">
                <td colspan="7" class="text-center py-4 text-muted">No interviews scheduled yet.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
}
