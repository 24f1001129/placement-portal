const StudentDashboard = {
  props: {
    user: {
      type: Object,
      required: true
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
      actionLoadingId: null
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
      if (tab === 'overview') {
        this.fetchOverviewData();
      } else if (tab === 'jobs') {
        this.fetchDrives();
      } else if (tab === 'applications') {
        this.fetchApplications();
      } else if (tab === 'offers') {
        this.fetchPlacements();
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
    }
  },
  created() {
    this.fetchOverviewData();
  },
  template: `
    <div>
      <!-- Dashboard Sub-Header -->
      <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <div>
          <h3 class="fw-light mb-0">Student Dashboard</h3>
          <p class="text-muted mb-0 small">Welcome, {{ user.name }}</p>
        </div>
        
        <div class="btn-group">
          <button class="btn btn-sm" :class="activeTab === 'overview' ? 'btn-dark' : 'btn-outline-secondary'" @click="switchTab('overview')">
            Overview
          </button>
          <button class="btn btn-sm" :class="activeTab === 'jobs' ? 'btn-dark' : 'btn-outline-secondary'" @click="switchTab('jobs')">
            Job Postings
          </button>
          <button class="btn btn-sm" :class="activeTab === 'applications' ? 'btn-dark' : 'btn-outline-secondary'" @click="switchTab('applications')">
            Applications
          </button>
          <button class="btn btn-sm" :class="activeTab === 'offers' ? 'btn-dark' : 'btn-outline-secondary'" @click="switchTab('offers')">
            Offers
          </button>
        </div>
      </div>

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
                <div class="border p-3 bg-light">
                  <span class="text-muted small">Jobs Applied</span>
                  <h4 class="fw-bold mb-0">{{ stats.totalApplied }}</h4>
                </div>
              </div>

              <div class="col-md-3 col-sm-6">
                <div class="border p-3 bg-light">
                  <span class="text-muted small">Shortlisted / Interview</span>
                  <h4 class="fw-bold mb-0">{{ stats.shortlisted }}</h4>
                </div>
              </div>

              <div class="col-md-3 col-sm-6">
                <div class="border p-3 bg-light">
                  <span class="text-muted small">Total Offers</span>
                  <h4 class="fw-bold mb-0">{{ stats.offers }}</h4>
                </div>
              </div>

              <div class="col-md-3 col-sm-6">
                <div class="border p-3" :class="stats.placed ? 'bg-success text-white' : 'bg-light'">
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
                <div v-else-if="interviews.length === 0" class="text-center py-4 text-muted small border bg-light">
                  No interviews scheduled yet.
                </div>
                <div v-else class="list-group list-group-flush">
                  <div v-for="i in interviews" :key="i.id" class="list-group-item px-0 py-2 d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div>
                      <strong>{{ i.company_name }} &bull; {{ i.position_name }}</strong>
                      <div class="text-muted small">
                        Time: {{ i.start_time }} ({{ i.duration }} mins) | Mode: {{ i.location }}
                      </div>
                    </div>
                    <div>
                      <a v-if="i.meeting_link" :href="i.meeting_link" target="_blank" class="btn btn-xs btn-dark py-1 px-3 small">
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
                <div v-else class="list-group list-group-flush">
                  <div v-for="p in placements" :key="p.id" class="list-group-item px-0 py-2 border-0 d-flex justify-content-between align-items-center">
                    <div>
                      <strong>{{ p.company_name }}</strong>
                      <div class="text-muted small">{{ p.position_name }}</div>
                    </div>
                    <button class="btn btn-xs btn-outline-dark" @click="switchTab('offers')">
                      View
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
          <div v-else-if="filteredDrives.length === 0" class="text-center py-4 border bg-white text-muted small">
            No placement drives found matching your search.
          </div>

          <!-- Job Listing -->
          <div v-else class="row g-3">
            <div v-for="d in filteredDrives" :key="d.id" class="col-12">
              <div class="card bg-light">
                <div class="card-header d-flex justify-content-between align-items-center flex-wrap gap-2 bg-transparent">
                  <div>
                    <strong class="text-dark fs-5">{{ d.company_name }} - {{ d.drive_name }}</strong>
                    <div class="text-muted small">{{ d.description }}</div>
                  </div>
                  <div class="text-end">
                    <span class="text-danger small fw-bold d-block">Deadline: {{ d.deadline }}</span>
                    <span class="text-muted small">Grad Year: {{ d.eligible_year }}</span>
                  </div>
                </div>
                
                <!-- Drive Positions -->
                <div class="card-body bg-white border-top">
                  <span class="small fw-bold text-muted d-block mb-2">Job Openings:</span>
                  <div class="row g-3">
                    <div v-for="p in d.positions" :key="p.id" class="col-12 col-md-6">
                      <div class="border p-3 bg-light h-100 d-flex flex-column justify-content-between">
                        <div>
                          <strong class="text-dark">{{ p.position_name }}</strong>
                          <p class="text-muted small mt-1 mb-2">{{ p.description }}</p>
                          
                          <div class="small text-muted mb-2">
                            CTC: <strong>INR {{ p.salary.toLocaleString() }}</strong> | 
                            Location: <strong>{{ p.location }}</strong> | 
                            Mode: <strong>{{ p.mode }}</strong> | 
                            Min CGPA: <strong>{{ p.min_cgpa }}</strong>
                          </div>

                          <div class="small mb-3 text-muted">
                            Skills: <strong>{{ p.skills }}</strong>
                          </div>
                        </div>

                        <!-- Apply Button -->
                        <div class="d-grid mt-2 border-top pt-2">
                          <button v-if="hasApplied(p.id)" class="btn btn-sm btn-secondary" disabled>
                            Applied
                          </button>
                          <button v-else class="btn btn-sm btn-dark" @click="applyToJob(p.id)" :disabled="actionLoadingId === p.id">
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
          
          <div v-else-if="applications.length === 0" class="text-center py-4 border bg-white text-muted small">
            No applications recorded yet. Browse job postings to apply.
          </div>

          <div v-else class="row g-2">
            <div v-for="a in applications" :key="a.id" class="col-12">
              <div class="card p-3">
                <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <div>
                    <strong class="text-dark">{{ a.position.company_name }} - {{ a.position.position_name }}</strong>
                    <div class="text-muted small">
                      Applied: {{ a.applied_at }} | CTC: INR {{ a.position.salary.toLocaleString() }} | Location: {{ a.position.location }}
                    </div>
                  </div>
                  <span class="badge" :class="getStatusBadgeClass(a.status)">
                    {{ a.status }}
                  </span>
                </div>

                <!-- Feedback -->
                <div v-if="a.feedback" class="mt-2 p-2 bg-light small border">
                  <strong>Feedback:</strong> {{ a.feedback }}
                </div>

                <!-- Interviews for this Application -->
                <div v-if="a.interviews && a.interviews.length > 0" class="mt-2 p-2 border bg-warning bg-opacity-10 rounded-0">
                  <strong class="small text-dark">Scheduled Interview:</strong>
                  <div v-for="i in a.interviews" :key="i.id" class="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-1">
                    <span class="small text-muted">
                      Time: {{ i.start_time }} ({{ i.duration }} mins) | Mode: {{ i.location }}
                    </span>
                    <a v-if="i.meeting_link" :href="i.meeting_link" target="_blank" class="btn btn-xs btn-dark py-0.5 px-2 small">
                      Join Meet
                    </a>
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

          <div v-else-if="placements.length === 0" class="text-center py-4 border bg-white text-muted small">
            No employment offers received yet.
          </div>

          <div v-else class="row g-3">
            <div v-for="p in placements" :key="p.id" class="col-12">
              <div class="card">
                <div class="card-body p-3">
                  <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                    <div>
                      <strong class="text-success fs-5">{{ p.company_name }} &bull; {{ p.position_name }}</strong>
                      <div class="text-muted small">Joining Date: {{ p.joining_date }} | Issued: {{ p.created_at }}</div>
                    </div>
                    <span class="badge" :class="getStatusBadgeClass(p.status)">
                      {{ p.status }}
                    </span>
                  </div>

                  <div class="p-3 bg-light border mb-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
                    <div>
                      <h6 class="mb-0">Employment Offer Letter Document</h6>
                      <span class="text-muted small">Official package details</span>
                    </div>
                    <a :href="p.offer_letter_path" target="_blank" download class="btn btn-sm btn-outline-dark">
                      Download Offer Letter PDF
                    </a>
                  </div>

                  <!-- Actions -->
                  <div v-if="p.status === 'PENDING'" class="d-flex justify-content-end gap-2">
                    <button class="btn btn-sm btn-outline-danger" @click="respondToPlacement(p.id, 'REJECTED')" :disabled="actionLoadingId === p.id">
                      <span v-if="actionLoadingId === p.id" class="spinner-border spinner-border-sm me-2" role="status"></span>
                      Reject Offer
                    </button>
                    <button class="btn btn-sm btn-success" @click="respondToPlacement(p.id, 'ACCEPTED')" :disabled="actionLoadingId === p.id">
                      <span v-if="actionLoadingId === p.id" class="spinner-border spinner-border-sm me-2" role="status"></span>
                      Accept Offer
                    </button>
                  </div>
                  <div v-else class="text-end text-muted small">
                    You have <strong>{{ p.status.toLowerCase() }}</strong> this offer.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
};

export default StudentDashboard;
