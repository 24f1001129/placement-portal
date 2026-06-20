export default {
  name: 'AdminDashboard',
  props: {
    user: Object
  },
  emits: ['navigate'],
  data() {
    return {
      activeTab: 'overview', // overview, companies, students, drives, applications
      stats: {
        total_students: 0,
        total_companies: 0,
        total_drives: 0,
        total_applications: 0,
        placed_students: 0,
        pending_companies: 0,
        pending_drives: 0
      },
      companies: [],
      students: [],
      drives: [],
      applications: [],
      companySearch: '',
      studentSearch: '',
      error: '',
      success: ''
    }
  },
  methods: {
    handleNav(route) {
      this.$emit('navigate', route);
    },
    clearMessages() {
      this.error = '';
      this.success = '';
    },
    async fetchStats() {
      try {
        const res = await fetch('/admin/stats');
        if (res.ok) {
          this.stats = await res.json();
        }
      } catch (err) {
        console.error('Error fetching stats:', err);
      }
    },
    async fetchCompanies() {
      try {
        const res = await fetch(`/admin/companies?search=${encodeURIComponent(this.companySearch)}`);
        if (res.ok) {
          const data = await res.json();
          this.companies = data.companies;
        }
      } catch (err) {
        console.error('Error fetching companies:', err);
      }
    },
    async fetchStudents() {
      try {
        const res = await fetch(`/admin/students?search=${encodeURIComponent(this.studentSearch)}`);
        if (res.ok) {
          const data = await res.json();
          this.students = data.students;
        }
      } catch (err) {
        console.error('Error fetching students:', err);
      }
    },
    async fetchDrives() {
      try {
        const res = await fetch('/admin/drives');
        if (res.ok) {
          const data = await res.json();
          this.drives = data.drives;
        }
      } catch (err) {
        console.error('Error fetching drives:', err);
      }
    },
    async fetchApplications() {
      try {
        const res = await fetch('/admin/applications');
        if (res.ok) {
          const data = await res.json();
          this.applications = data.applications;
        }
      } catch (err) {
        console.error('Error fetching applications:', err);
      }
    },
    async updateCompanyStatus(id, status) {
      this.clearMessages();
      try {
        const res = await fetch(`/admin/companies/${id}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ approval_status: status })
        });
        const data = await res.json();
        if (res.ok) {
          this.success = data.message;
          this.fetchCompanies();
          this.fetchStats();
        } else {
          this.error = data.error;
        }
      } catch (err) {
        this.error = 'Failed to update company status.';
      }
    },
    async toggleCompanyBlacklist(id) {
      this.clearMessages();
      try {
        const res = await fetch(`/admin/companies/${id}/blacklist`, { method: 'PUT' });
        const data = await res.json();
        if (res.ok) {
          this.success = data.message;
          this.fetchCompanies();
        } else {
          this.error = data.error;
        }
      } catch (err) {
        this.error = 'Failed to toggle company blacklist.';
      }
    },
    async toggleStudentBlacklist(id) {
      this.clearMessages();
      try {
        const res = await fetch(`/admin/students/${id}/blacklist`, { method: 'PUT' });
        const data = await res.json();
        if (res.ok) {
          this.success = data.message;
          this.fetchStudents();
          this.fetchStats();
        } else {
          this.error = data.error;
        }
      } catch (err) {
        this.error = 'Failed to toggle student blacklist.';
      }
    },
    async updateDriveStatus(id, status) {
      this.clearMessages();
      try {
        const res = await fetch(`/admin/drives/${id}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        });
        const data = await res.json();
        if (res.ok) {
          this.success = data.message;
          this.fetchDrives();
          this.fetchStats();
        } else {
          this.error = data.error;
        }
      } catch (err) {
        this.error = 'Failed to update drive status.';
      }
    },
    switchTab(tab) {
      this.activeTab = tab;
      this.clearMessages();
      if (tab === 'overview') this.fetchStats();
      else if (tab === 'companies') this.fetchCompanies();
      else if (tab === 'students') this.fetchStudents();
      else if (tab === 'drives') this.fetchDrives();
      else if (tab === 'applications') this.fetchApplications();
    }
  },
  created() {
    this.fetchStats();
  },
  template: `
    <div class="container my-4">
      <div class="row mb-3">
        <div class="col">
          <h2>Placement Cell Admin Dashboard</h2>
          <p class="text-muted small">Manage students, company approvals, placement drives, and track job applications.</p>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <ul class="nav nav-tabs mb-4">
        <li class="nav-item">
          <button class="nav-link" :class="{ active: activeTab === 'overview' }" @click="switchTab('overview')">Overview</button>
        </li>
        <li class="nav-item">
          <button class="nav-link" :class="{ active: activeTab === 'companies' }" @click="switchTab('companies')">Companies</button>
        </li>
        <li class="nav-item">
          <button class="nav-link" :class="{ active: activeTab === 'students' }" @click="switchTab('students')">Students</button>
        </li>
        <li class="nav-item">
          <button class="nav-link" :class="{ active: activeTab === 'drives' }" @click="switchTab('drives')">Placement Drives</button>
        </li>
        <li class="nav-item">
          <button class="nav-link" :class="{ active: activeTab === 'applications' }" @click="switchTab('applications')">Applications</button>
        </li>
      </ul>

      <!-- Alerts -->
      <div v-if="error" class="alert alert-danger p-2 mb-3 small">{{ error }}</div>
      <div v-if="success" class="alert alert-success p-2 mb-3 small">{{ success }}</div>

      <!-- Tab Content: Overview -->
      <div v-if="activeTab === 'overview'">
        <div class="row g-3 text-center mb-4">
          <div class="col-6 col-md-3">
            <div class="card p-3 border">
              <span class="text-muted small">Students</span>
              <h3>{{ stats.total_students }}</h3>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="card p-3 border">
              <span class="text-muted small">Companies (Approved)</span>
              <h3>{{ stats.total_companies }}</h3>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="card p-3 border">
              <span class="text-muted small">Approved Drives</span>
              <h3>{{ stats.total_drives }}</h3>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="card p-3 border">
              <span class="text-muted small">Placed Students</span>
              <h3>{{ stats.placed_students }}</h3>
            </div>
          </div>
        </div>

        <div class="row g-3 text-center">
          <div class="col-6 col-md-4">
            <div class="card p-3 border border-warning">
              <span class="text-muted small">Pending Companies</span>
              <h3 class="text-warning">{{ stats.pending_companies }}</h3>
            </div>
          </div>
          <div class="col-6 col-md-4">
            <div class="card p-3 border border-warning">
              <span class="text-muted small">Pending Drives</span>
              <h3 class="text-warning">{{ stats.pending_drives }}</h3>
            </div>
          </div>
          <div class="col-12 col-md-4">
            <div class="card p-3 border">
              <span class="text-muted small">Total Applications</span>
              <h3>{{ stats.total_applications }}</h3>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab Content: Companies -->
      <div v-else-if="activeTab === 'companies'">
        <div class="row g-2 mb-3 align-items-center">
          <div class="col-auto">
            <input type="text" v-model="companySearch" class="form-control form-control-sm" placeholder="Search name / industry..." @keyup.enter="fetchCompanies">
          </div>
          <div class="col-auto">
            <button class="btn btn-sm btn-secondary" @click="fetchCompanies">Search</button>
          </div>
        </div>

        <div class="table-responsive">
          <table class="table table-bordered table-striped align-middle small">
            <thead>
              <tr>
                <th>Company Name</th>
                <th>Industry</th>
                <th>Location</th>
                <th>Contact / Web</th>
                <th>Approval</th>
                <th>Blacklist</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in companies" :key="c.id">
                <td>
                  <strong>{{ c.company_name }}</strong><br>
                  <span class="text-muted" style="font-size: 0.8rem;">{{ c.email }}</span>
                </td>
                <td>{{ c.industry }}</td>
                <td>{{ c.location }}</td>
                <td>
                  <span class="d-block">HR: {{ c.hr_contact }}</span>
                  <a :href="c.website" target="_blank" class="small">{{ c.website }}</a>
                </td>
                <td>
                  <span class="badge" :class="c.approval_status === 'APPROVED' ? 'bg-success' : (c.approval_status === 'REJECTED' ? 'bg-danger' : 'bg-warning')">
                    {{ c.approval_status }}
                  </span>
                </td>
                <td>
                  <span class="badge" :class="c.is_blacklisted ? 'bg-danger' : 'bg-secondary'">
                    {{ c.is_blacklisted ? 'Blacklisted' : 'Active' }}
                  </span>
                </td>
                <td>
                  <div class="d-flex gap-1 flex-wrap">
                    <button v-if="c.approval_status !== 'APPROVED'" class="btn btn-xs btn-success py-0.5 px-2" style="font-size: 0.75rem;" @click="updateCompanyStatus(c.id, 'APPROVED')">Approve</button>
                    <button v-if="c.approval_status !== 'REJECTED'" class="btn btn-xs btn-outline-danger py-0.5 px-2" style="font-size: 0.75rem;" @click="updateCompanyStatus(c.id, 'REJECTED')">Reject</button>
                    <button class="btn btn-xs btn-dark py-0.5 px-2" style="font-size: 0.75rem;" @click="toggleCompanyBlacklist(c.id)">
                      {{ c.is_blacklisted ? 'Whitelist' : 'Blacklist' }}
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="companies.length === 0">
                <td colspan="7" class="text-center text-muted">No companies registered.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tab Content: Students -->
      <div v-else-if="activeTab === 'students'">
        <div class="row g-2 mb-3 align-items-center">
          <div class="col-auto">
            <input type="text" v-model="studentSearch" class="form-control form-control-sm" placeholder="Search name / branch / skills..." @keyup.enter="fetchStudents">
          </div>
          <div class="col-auto">
            <button class="btn btn-sm btn-secondary" @click="fetchStudents">Search</button>
          </div>
        </div>

        <div class="table-responsive">
          <table class="table table-bordered table-striped align-middle small">
            <thead>
              <tr>
                <th>Name / Roll</th>
                <th>Branch</th>
                <th>CGPA</th>
                <th>Grad Year</th>
                <th>Skills</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in students" :key="s.id">
                <td>
                  <strong>{{ s.full_name }}</strong><br>
                  <span class="text-muted" style="font-size: 0.8rem;">Phone: {{ s.phone }}</span>
                </td>
                <td>{{ s.branch }}</td>
                <td>{{ s.cgpa }}</td>
                <td>{{ s.grad_year }}</td>
                <td><span class="small">{{ s.skills }}</span></td>
                <td>
                  <span class="badge" :class="s.is_blacklisted ? 'bg-danger' : 'bg-success'">
                    {{ s.is_blacklisted ? 'Blacklisted' : 'Active' }}
                  </span>
                </td>
                <td>
                  <button class="btn btn-xs btn-dark py-0.5 px-2" style="font-size: 0.75rem;" @click="toggleStudentBlacklist(s.id)">
                    {{ s.is_blacklisted ? 'Activate' : 'Blacklist' }}
                  </button>
                </td>
              </tr>
              <tr v-if="students.length === 0">
                <td colspan="7" class="text-center text-muted">No student profiles found.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tab Content: Placement Drives -->
      <div v-else-if="activeTab === 'drives'">
        <div class="table-responsive">
          <table class="table table-bordered table-striped align-middle small">
            <thead>
              <tr>
                <th>Company</th>
                <th>Drive Name</th>
                <th>Eligible Year</th>
                <th>Deadline</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="d in drives" :key="d.id">
                <td><strong>{{ d.company_name }}</strong></td>
                <td>
                  {{ d.drive_name }}<br>
                  <span class="text-muted" style="font-size: 0.8rem;">{{ d.description }}</span>
                </td>
                <td>{{ d.eligible_year }}</td>
                <td>{{ d.deadline }}</td>
                <td>
                  <span class="badge" :class="d.status === 'APPROVED' ? 'bg-success' : (d.status === 'REJECTED' ? 'bg-danger' : 'bg-warning')">
                    {{ d.status }}
                  </span>
                </td>
                <td>
                  <div class="d-flex gap-1">
                    <button v-if="d.status !== 'APPROVED'" class="btn btn-xs btn-success py-0.5 px-2" style="font-size: 0.75rem;" @click="updateDriveStatus(d.id, 'APPROVED')">Approve</button>
                    <button v-if="d.status !== 'REJECTED'" class="btn btn-xs btn-danger py-0.5 px-2" style="font-size: 0.75rem;" @click="updateDriveStatus(d.id, 'REJECTED')">Reject</button>
                  </div>
                </td>
              </tr>
              <tr v-if="drives.length === 0">
                <td colspan="6" class="text-center text-muted">No placement drives found.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tab Content: Applications -->
      <div v-else-if="activeTab === 'applications'">
        <div class="table-responsive">
          <table class="table table-bordered table-striped align-middle small">
            <thead>
              <tr>
                <th>Student</th>
                <th>Target Company</th>
                <th>Position</th>
                <th>Applied At</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="a in applications" :key="a.id">
                <td>
                  <strong>{{ a.student_name }}</strong><br>
                  <span class="text-muted" style="font-size: 0.8rem;">{{ a.student_branch }}</span>
                </td>
                <td>{{ a.company_name }}</td>
                <td>{{ a.position_name }}</td>
                <td>{{ a.applied_at }}</td>
                <td>
                  <span class="badge bg-secondary">{{ a.status }}</span>
                </td>
              </tr>
              <tr v-if="applications.length === 0">
                <td colspan="5" class="text-center text-muted">No applications recorded in the system.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
}
