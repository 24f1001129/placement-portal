const StudentDashboard = {
  props: {
    user: {
      type: Object,
      required: true
    },
    currentRoute: {
      type: String,
      default: ''
    }
  },
  watch: {
    currentRoute(newRoute) {
      this.syncTabWithRoute(newRoute);
    }
  },
  data() {
    return {
      activeTab: 'overview',
      drives: [],
      applications: [],
      interviews: [],
      placements: [],
      searchQuery: '',
      error: '',
      success: '',
      loading: false,
      actionLoadingId: null,
      exportPolling: null,
      chartData: null,
      charts: {}
    };
  },
  computed: {
    stats() {
      const totalApplied = this.applications.length;
      const shortlisted = this.applications.filter(a => ['SHORTLISTED', 'INTERVIEW', 'PLACED'].includes(a.status)).length;
      const offers = this.placements.length;
      const acceptedOffer = this.placements.find(p => p.status === 'ACCEPTED');
      return { totalApplied, shortlisted, offers, placed: !!acceptedOffer, placedCompany: acceptedOffer?.company_name };
    },
    filteredDrives() {
      if (!this.searchQuery.trim()) return this.drives;
      const query = this.searchQuery.toLowerCase();
      return this.drives.filter(d => {
        const matchDrive = d.drive_name.toLowerCase().includes(query) || d.company_name.toLowerCase().includes(query);
        const matchPosition = d.positions.some(p =>
          p.position_name.toLowerCase().includes(query) ||
          p.skills.toLowerCase().includes(query)
        );
        return matchDrive || matchPosition;
      });
    }
  },
  methods: {
    switchTab(tab) {
      this.activeTab = tab;
      this.clearMessages();
      this.refreshData();
    },
    refreshData() {
      if (this.activeTab === 'overview') {
        this.fetchOverviewData();
      } else if (this.activeTab === 'jobs') {
        this.fetchDrives();
      } else if (this.activeTab === 'applications') {
        this.fetchApplications();
      } else if (this.activeTab === 'offers') {
        this.fetchPlacements();
      } else if (this.activeTab === 'analytics') {
        this.fetchChartData();
      }
    },
    clearMessages() {
      this.error = '';
      this.success = '';
    },
    async fetchOverviewData() {
      this.loading = true;
      try {
        const [appRes, intRes, placeRes] = await Promise.all([
          fetch('/student/applications'),
          fetch('/student/interviews'),
          fetch('/student/placements')
        ]);
        if (appRes.ok) this.applications = (await appRes.json()).applications;
        if (intRes.ok) this.interviews = (await intRes.json()).interviews;
        if (placeRes.ok) this.placements = (await placeRes.json()).placements;
      } catch (err) {
        this.error = 'Failed to load dashboard data.';
      } finally {
        this.loading = false;
      }
    },
    async fetchDrives() {
      this.loading = true;
      try {
        const [drivesRes, appsRes] = await Promise.all([
          fetch('/student/drives'),
          fetch('/student/applications')
        ]);
        if (drivesRes.ok) this.drives = (await drivesRes.json()).drives;
        if (appsRes.ok) this.applications = (await appsRes.json()).applications;
      } catch (err) {
        this.error = 'Failed to fetch placement drives.';
      } finally {
        this.loading = false;
      }
    },
    async fetchApplications() {
      this.loading = true;
      try {
        const res = await fetch('/student/applications');
        if (res.ok) {
          this.applications = (await res.json()).applications;
        }
      } catch (err) {
        this.error = 'Failed to fetch application history.';
      } finally {
        this.loading = false;
      }
    },
    async fetchPlacements() {
      this.loading = true;
      try {
        const res = await fetch('/student/placements');
        if (res.ok) {
          this.placements = (await res.json()).placements;
        }
      } catch (err) {
        this.error = 'Failed to fetch placement offers.';
      } finally {
        this.loading = false;
      }
    },
    hasApplied(positionId) {
      return this.applications.some(a => a.position.id === positionId);
    },
    async applyToJob(positionId) {
      this.clearMessages();
      this.actionLoadingId = positionId;
      try {
        const res = await fetch('/student/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position_id: positionId })
        });
        const result = await res.json();
        if (res.ok) {
          this.success = 'Application submitted successfully!';
          this.fetchDrives();
        } else {
          this.error = result.error || 'Failed to submit application.';
        }
      } catch (err) {
        this.error = 'Network error submitting application.';
      } finally {
        this.actionLoadingId = null;
      }
    },
    async respondToPlacement(placementId, status) {
      this.clearMessages();
      this.actionLoadingId = placementId;
      try {
        const res = await fetch(`/student/placements/${placementId}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        });
        const result = await res.json();
        if (res.ok) {
          this.success = `Offer successfully ${status.toLowerCase()}!`;
          this.fetchPlacements();
        } else {
          this.error = result.error || 'Failed to update offer status.';
        }
      } catch (err) {
        this.error = 'Network error updating offer.';
      } finally {
        this.actionLoadingId = null;
      }
    },
    getStatusBadgeClass(status) {
      switch (status) {
        case 'PLACED':
        case 'ACCEPTED':
          return 'bg-success text-white';
        case 'SHORTLISTED':
        case 'INTERVIEW':
          return 'bg-warning text-dark';
        case 'REJECTED':
          return 'bg-danger text-white';
        default:
          return 'bg-secondary text-white';
      }
    },
    getInterviewBgClass(status) {
      if (status === 'COMPLETED') return 'bg-success bg-opacity-10 border-success';
      if (status === 'MISSED') return 'bg-danger bg-opacity-10 border-danger';
      return 'bg-warning bg-opacity-10 border-warning';
    },
    syncTabWithRoute(route) {
      if (!route) return;
      if (route.endsWith('/student/applications')) {
        this.switchTab('applications');
      } else if (route.endsWith('/student/dashboard')) {
        this.switchTab('overview');
      } else if (route.endsWith('/student/analytics')) {
        this.switchTab('analytics');
      }
    },
    isExpired(deadlineIso) {
      if (!deadlineIso) return false;
      return new Date() > new Date(deadlineIso);
    },
    async exportData() {
      this.clearMessages();
      try {
        const res = await fetch('/student/export', { method: 'POST' });
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
    },
    async fetchChartData() {
      try {
        const res = await fetch('/student/chart-data');
        if (res.ok) {
          this.chartData = await res.json();
          this.$nextTick(() => this.renderCharts());
        }
      } catch (err) {
        console.error('Error fetching chart data:', err);
      }
    },
    renderCharts() {
      if (!this.chartData) return;
      const textColor = getComputedStyle(document.documentElement).getPropertyValue('--bs-body-color').trim() || '#dee2e6';

      if (this.charts.status) this.charts.status.destroy();
      const ctx1 = document.getElementById('studentStatusChart');
      if (ctx1) {
        this.charts.status = new Chart(ctx1, {
          type: 'doughnut',
          data: {
            labels: ['Applied', 'Shortlisted', 'Interview', 'Rejected', 'Placed'],
            datasets: [{
              data: [
                this.chartData.application_status.Applied,
                this.chartData.application_status.Shortlisted,
                this.chartData.application_status.Interview,
                this.chartData.application_status.Rejected,
                this.chartData.application_status.Placed
              ],
              backgroundColor: ['#6c757d', '#0dcaf0', '#ffc107', '#dc3545', '#198754']
            }]
          },
          options: { plugins: { legend: { labels: { color: textColor } } } }
        });
      }

      if (this.charts.acceptance) this.charts.acceptance.destroy();
      const ctx2 = document.getElementById('studentAcceptanceChart');
      if (ctx2) {
        this.charts.acceptance = new Chart(ctx2, {
          type: 'bar',
          data: {
            labels: this.chartData.company_acceptance.map(c => c.name),
            datasets: [{ label: 'Acceptance Rate %', data: this.chartData.company_acceptance.map(c => c.rate), backgroundColor: '#0d6efd' }]
          },
          options: { scales: { x: { ticks: { color: textColor } }, y: { ticks: { color: textColor }, max: 100 } }, plugins: { legend: { labels: { color: textColor } } } }
        });
      }
    }
  },
  unmounted() {
    if (this.exportPolling) clearInterval(this.exportPolling);
    if (this.pollingInterval) clearInterval(this.pollingInterval);
    Object.values(this.charts).forEach(c => c && c.destroy());
  },
  created() {
    this.syncTabWithRoute(this.currentRoute);
    this.pollingInterval = setInterval(() => {
      this.refreshData();
    }, 60000);
  },
  template: `
    <div>
      <!-- Dashboard Sub-Header -->
      <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <div>
          <h3 class="fw-light mb-0">Student Dashboard</h3>
          <p class="text-muted mb-0 small">Welcome, {{ user.name }}</p>
        </div>
        
        <div class="d-flex gap-3 align-items-center flex-wrap">
          <button class="btn btn-sm btn-outline-dark" @click="exportData()">
            Export Data
          </button>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <ul class="nav nav-tabs mb-4">
        <li class="nav-item">
          <button class="nav-link" :class="{ active: activeTab === 'overview' }" @click="switchTab('overview')">Overview</button>
        </li>
        <li class="nav-item">
          <button class="nav-link" :class="{ active: activeTab === 'jobs' }" @click="switchTab('jobs')">Job Postings</button>
        </li>
        <li class="nav-item">
          <button class="nav-link" :class="{ active: activeTab === 'applications' }" @click="switchTab('applications')">Applications</button>
        </li>
        <li class="nav-item">
          <button class="nav-link" :class="{ active: activeTab === 'offers' }" @click="switchTab('offers')">Offers</button>
        </li>
        <li class="nav-item">
          <button class="nav-link" :class="{ active: activeTab === 'analytics' }" @click="switchTab('analytics')">Analytics</button>
        </li>
      </ul>


      <!-- Alerts -->
      <div v-if="success" class="alert alert-success py-2 rounded-0" role="alert">
        {{ success }}
      </div>

      <div v-if="error" class="alert alert-danger py-2 rounded-0" role="alert">
        {{ error }}
      </div>

      <!-- MAIN TAB VIEWPORT -->
      <div class="tab-content mt-2">
        <!-- OVERVIEW TAB -->
        <div v-if="activeTab === 'overview'" class="row g-4">
          <!-- Stats Cards -->
          <div class="col-12">
            <div class="row g-3">
              <div class="col-md-3 col-sm-6">
                <div class="border p-3 bg-body-tertiary">
                  <span class="text-muted small">Jobs Applied</span>
                  <h4 class="fw-bold mb-0">{{ stats.totalApplied }}</h4>
                </div>
              </div>

              <div class="col-md-3 col-sm-6">
                <div class="border p-3 bg-body-tertiary">
                  <span class="text-muted small">Shortlisted / Interview</span>
                  <h4 class="fw-bold mb-0">{{ stats.shortlisted }}</h4>
                </div>
              </div>

              <div class="col-md-3 col-sm-6">
                <div class="border p-3 bg-body-tertiary">
                  <span class="text-muted small">Total Offers</span>
                  <h4 class="fw-bold mb-0">{{ stats.offers }}</h4>
                </div>
              </div>

              <div class="col-md-3 col-sm-6">
                <div class="border p-3" :class="stats.placed ? 'bg-success text-white' : 'bg-body-tertiary'">
                  <span class="small" :class="stats.placed ? 'text-white' : 'text-muted'">Placement Status</span>
                  <h4 class="fw-bold mb-0">{{ stats.placed ? 'PLACED' : 'Not Placed' }}</h4>
                  <span class="small" v-if="stats.placed">at {{ stats.placedCompany }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Scheduled Interviews -->
          <div class="col-lg-8 col-12">
            <div class="card">
              <div class="card-header">
                <h5 class="mb-0">Scheduled Interviews</h5>
              </div>
              <div class="card-body">
                <div v-if="loading" class="text-center py-4">
                  <div class="spinner-border text-primary" role="status"></div>
                </div>
                <div v-else-if="interviews.length === 0" class="text-center py-4 text-muted small border bg-body-tertiary">
                  No interviews scheduled yet.
                </div>
                <div v-else class="list-group list-group-flush border-0">
                  <div v-for="i in interviews" :key="i.id" class="p-3 border rounded-0 mb-2" :class="getInterviewBgClass(i.status)">
                    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                      <div>
                        <strong>{{ i.company_name }} &bull; {{ i.position_name }} <span class="small badge ms-1 border" :class="i.status === 'COMPLETED' ? 'text-success border-success' : (i.status === 'MISSED' ? 'text-danger border-danger' : 'text-warning border-warning')">{{ i.status }}</span></strong>
                        <div class="text-muted small mt-1">
                          Time: {{ i.start_time }} ({{ i.duration }} mins) | Mode: {{ i.location }}
                        </div>
                      </div>
                      <a v-if="i.meeting_link && i.status !== 'COMPLETED' && i.status !== 'MISSED'" :href="i.meeting_link" target="_blank" class="btn btn-xs btn-dark py-1 px-3 small">
                        Join Meeting
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Quick Offers View -->
          <div class="col-lg-4 col-12">
            <div class="card mb-4">
              <div class="card-header">
                <h5 class="mb-0">Active Offers</h5>
              </div>
              <div class="card-body">
                <div v-if="placements.length === 0" class="text-center py-3 text-muted small">
                  No job offers received yet.
                </div>
                <div v-else class="list-group list-group-flush border-0">
                  <div v-for="p in placements" :key="p.id" class="p-3 border border-success rounded bg-success bg-opacity-10 mb-2 d-flex justify-content-between align-items-center shadow-sm">
                    <div>
                      <strong class="text-success-emphasis fs-6">🎉 {{ p.company_name }}</strong>
                      <div class="text-success small opacity-75 fw-semibold mt-1">{{ p.position_name }}</div>
                    </div>
                    <button class="btn btn-sm btn-success" @click="switchTab('offers')">
                      View Offer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- JOB POSTINGS TAB -->
        <div v-if="activeTab === 'jobs'">
          <!-- Search Bar -->
          <div class="card mb-3">
            <div class="card-body p-2">
              <input type="text" v-model="searchQuery" class="form-control form-control-sm border-0" placeholder="Search by company, job role, or skills..." />
            </div>
          </div>

          <!-- Loading state -->
          <div v-if="loading" class="text-center py-5">
            <div class="spinner-border text-primary" role="status"></div>
          </div>

          <!-- Empty list state -->
          <div v-else-if="filteredDrives.length === 0" class="text-center py-4 border bg-body-tertiary text-muted small">
            No placement drives found matching your search.
          </div>

          <!-- Job Listing -->
          <div v-else class="row g-3">
            <div v-for="d in filteredDrives" :key="d.id" class="col-12">
              <div class="card shadow-sm">
                <div class="card-header d-flex justify-content-between align-items-center flex-wrap gap-2 bg-primary-subtle border-bottom-0">
                  <div>
                    <strong class="fs-5 text-primary-emphasis">{{ d.company_name }} - {{ d.drive_name }}</strong>
                    <div class="text-muted small">{{ d.description }}</div>
                  </div>
                  <div class="text-end">
                    <span class="text-danger small fw-bold d-block">Deadline: {{ d.deadline }}</span>
                    <span class="text-muted small">Grad Year: {{ d.eligible_year }}</span>
                  </div>
                </div>
                
                <!-- Drive Positions -->
                <div class="card-body bg-body-tertiary border-top">
                  <span class="small fw-bold text-muted d-block mb-2">Job Openings:</span>
                  <div class="row g-3">
                    <div v-for="p in d.positions" :key="p.id" class="col-12 col-md-6">
                      <div class="border border-primary-subtle rounded p-3 bg-primary-subtle h-100 d-flex flex-column justify-content-between">
                        <div>
                          <strong>{{ p.position_name }}</strong>
                          <p class="text-muted small mt-1 mb-2">{{ p.description }}</p>
                          
                          <div class="small text-muted mb-2">
                            CTC: <strong>INR {{ p.salary }}</strong> | 
                            Location: <strong>{{ p.location }}</strong> | 
                            Mode: <strong>{{ p.mode }}</strong> | 
                            Min CGPA: <strong>{{ p.min_cgpa }}</strong>
                          </div>

                          <div class="small mb-3 text-muted">
                            Skills: <strong>{{ p.skills }}</strong>
                          </div>
                        </div>

                        <!-- Apply Button -->
                        <div class="d-grid mt-2 border-top border-primary-subtle pt-2">
                          <button v-if="hasApplied(p.id)" class="btn btn-sm btn-secondary" disabled>
                            Applied
                          </button>
                          <button v-else-if="isExpired(d.raw_deadline)" class="btn btn-sm btn-secondary opacity-75" disabled>
                            Deadline Over
                          </button>
                          <button v-else class="btn btn-sm btn-dark" @click="applyToJob(p.id)" :disabled="actionLoadingId === p.id || stats.placed" :title="stats.placed ? 'You have already accepted a placement offer' : ''">
                            <span v-if="actionLoadingId === p.id" class="spinner-border spinner-border-sm me-2" role="status"></span>
                            Apply
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- APPLICATIONS TAB -->
        <div v-if="activeTab === 'applications'">
          <div v-if="loading" class="text-center py-5">
            <div class="spinner-border text-primary" role="status"></div>
          </div>
          
          <div v-else-if="applications.length === 0" class="text-center py-4 border bg-body-tertiary text-muted small">
            No applications recorded yet. Browse job postings to apply.
          </div>

          <div v-else class="row g-2">
            <div v-for="a in applications" :key="a.id" class="col-12">
              <div class="card p-3">
                <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <div>
                    <strong>{{ a.position.company_name }} - {{ a.position.position_name }}</strong>
                    <div class="text-muted small">
                      Applied: {{ a.applied_at }} | CTC: INR {{ a.position.salary }} | Location: {{ a.position.location }}
                    </div>
                  </div>
                  <span class="badge" :class="getStatusBadgeClass(a.status)">
                    {{ a.status }}
                  </span>
                </div>

                <!-- Feedback -->
                <div v-if="a.feedback" class="mt-2 p-2 bg-body-tertiary small border">
                  <strong>Feedback:</strong> {{ a.feedback }}
                </div>

                <!-- Interviews for this Application -->
                <div v-if="a.interviews && a.interviews.length > 0" class="mt-2">
                  <div v-for="i in a.interviews" :key="i.id" class="p-2 border rounded-0 mb-1" :class="getInterviewBgClass(i.status)">
                    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                      <div>
                        <strong class="small">Scheduled Interview ({{ i.status }}):</strong>
                        <div class="small text-muted mt-1">
                          Time: {{ i.start_time }} ({{ i.duration }} mins) | Mode: {{ i.location }}
                        </div>
                      </div>
                      <a v-if="i.meeting_link && i.status !== 'COMPLETED' && i.status !== 'MISSED'" :href="i.meeting_link" target="_blank" class="btn btn-xs btn-dark py-0.5 px-2 small">
                        Join Meet
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- OFFERS TAB -->
        <div v-if="activeTab === 'offers'">
          <div v-if="loading" class="text-center py-5">
            <div class="spinner-border text-primary" role="status"></div>
          </div>

          <div v-else-if="placements.length === 0" class="text-center py-4 border bg-body-tertiary text-muted small">
            No employment offers received yet.
          </div>

          <div v-else class="row g-3">
            <div v-for="p in placements" :key="p.id" class="col-12">
              <div class="card">
                <div class="card-body p-3">
                  <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                    <div>
                      <strong class="text-success fs-5">{{ p.company_name }} &bull; {{ p.position_name }}</strong>
                      <div class="text-muted small">Joining Date: {{ p.joining_date }} | Issued: {{ p.created_at }} | Deadline: {{ p.acceptance_deadline }}</div>
                    </div>
                    <span class="badge" :class="getStatusBadgeClass(p.status)">
                      {{ p.status }}
                    </span>
                  </div>

                  <div class="p-3 bg-body-tertiary border mb-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
                    <div>
                      <h6 class="mb-0">Employment Offer Letter Document</h6>
                      <span class="text-muted small">Official package details</span>
                    </div>
                    <a :href="p.offer_letter_path" target="_blank" download class="btn btn-sm btn-outline-secondary">
                      Download Offer Letter PDF
                    </a>
                  </div>

                  <!-- Actions -->
                  <div v-if="p.status === 'PENDING'" class="d-flex justify-content-between align-items-center w-100 flex-wrap gap-2">
                    <div class="small fw-bold">
                      <span v-if="isExpired(p.raw_acceptance_deadline)" class="text-danger">EXPIRED</span>
                      <span v-else class="text-muted">Accept before: {{ p.acceptance_deadline }}</span>
                    </div>
                    <div class="d-flex gap-2">
                      <button class="btn btn-sm btn-outline-danger" @click="respondToPlacement(p.id, 'REJECTED')" :disabled="actionLoadingId === p.id || isExpired(p.raw_acceptance_deadline)">
                        <span v-if="actionLoadingId === p.id" class="spinner-border spinner-border-sm me-2" role="status"></span>
                        Reject Offer
                      </button>
                      <button class="btn btn-sm btn-success" @click="respondToPlacement(p.id, 'ACCEPTED')" :disabled="actionLoadingId === p.id || isExpired(p.raw_acceptance_deadline)">
                        <span v-if="actionLoadingId === p.id" class="spinner-border spinner-border-sm me-2" role="status"></span>
                        Accept Offer
                      </button>
                    </div>
                  </div>
                  <div v-else class="text-end text-muted small">
                    You have <strong>{{ p.status.toLowerCase() }}</strong> this offer.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ANALYTICS TAB -->
        <div v-if="activeTab === 'analytics'">
          <div class="row g-4">
            <div class="col-md-6">
              <div class="card p-3 border">
                <h6 class="text-muted small mb-3">Application Status</h6>
                <canvas id="studentStatusChart" height="250"></canvas>
              </div>
            </div>
            <div class="col-md-6">
              <div class="card p-3 border">
                <h6 class="text-muted small mb-3">Company Acceptance Rates</h6>
                <canvas id="studentAcceptanceChart" height="250"></canvas>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
};

export default StudentDashboard;
