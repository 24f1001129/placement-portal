export default {
  name: 'Navbar',
  props: {
    user: Object,
    isAuthenticated: Boolean,
    theme: String
  },
  emits: ['logout', 'navigate', 'toggle-theme'],
  methods: {
    handleNav(route) {
      this.$emit('navigate', route);
    },
    handleLogout() {
      this.$emit('logout');
    }
  },
  template: `
    <nav class="navbar navbar-expand-lg border-bottom sticky-top bg-body-tertiary">
      <div class="container">
        <a class="navbar-brand fw-bold" href="#" @click.prevent="handleNav('/')">
          Placement Portal
        </a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarNav">
          <ul class="navbar-nav ms-auto align-items-center">
            <!-- Guest Links -->
            <template v-if="!isAuthenticated">
              <li class="nav-item">
                <a class="nav-link" href="#/login" @click.prevent="handleNav('/login')">Login</a>
              </li>
              <li class="nav-item">
                <a class="nav-link" href="#/register/student" @click.prevent="handleNav('/register/student')">Student Sign Up</a>
              </li>
              <li class="nav-item">
                <a class="nav-link" href="#/register/company" @click.prevent="handleNav('/register/company')">Recruiter Registration</a>
              </li>
            </template>

            <!-- Student Links -->
            <template v-else-if="user.role === 'STUDENT'">
              <li class="nav-item">
                <a class="nav-link" href="#/student/dashboard" @click.prevent="handleNav('/student/dashboard')">Dashboard</a>
              </li>
              <li class="nav-item">
                <a class="nav-link" href="#/student/profile" @click.prevent="handleNav('/student/profile')">Profile</a>
              </li>
              <li class="nav-item">
                <a class="nav-link" href="#/student/applications" @click.prevent="handleNav('/student/applications')">Applications</a>
              </li>
              <li class="nav-item ms-lg-1">
                <span class="text-muted me-3">Hi, {{ user.name }}</span>
                <button class="btn btn-sm btn-outline-secondary" @click="handleLogout">Logout</button>
              </li>
            </template>

            <!-- Company Links -->
            <template v-else-if="user.role === 'COMPANY'">
              <li class="nav-item">
                <a class="nav-link" href="#/company/dashboard" @click.prevent="handleNav('/company/dashboard')">Dashboard</a>
              </li>
              <li class="nav-item">
                <a class="nav-link" href="#/company/profile" @click.prevent="handleNav('/company/profile')">Company Profile</a>
              </li>
              <li class="nav-item">
                <a class="nav-link" href="#/company/drives" @click.prevent="handleNav('/company/drives')">Drives & Jobs</a>
              </li>
              <li class="nav-item ms-lg-1">
                <span class="text-muted me-3">{{ user.name }}</span>
                <button class="btn btn-sm btn-outline-secondary" @click="handleLogout">Logout</button>
              </li>
            </template>

            <!-- Admin Links -->
            <template v-else-if="user.role === 'ADMIN'">
              <li class="nav-item">
                <a class="nav-link" href="#/admin/dashboard" @click.prevent="handleNav('/admin/dashboard')">Dashboard</a>
              </li>
              <li class="nav-item">
                <a class="nav-link" href="#/admin/companies" @click.prevent="handleNav('/admin/companies')">Companies</a>
              </li>
              <li class="nav-item">
                <a class="nav-link" href="#/admin/students" @click.prevent="handleNav('/admin/students')">Students</a>
              </li>
              <li class="nav-item">
                <a class="nav-link" href="#/admin/drives" @click.prevent="handleNav('/admin/drives')">Drives</a>
              </li>
              <li class="nav-item ms-lg-1">
                <span class="text-muted me-3">Admin</span>
                <button class="btn btn-sm btn-outline-secondary" @click="handleLogout">Logout</button>
              </li>
            </template>
            <li class="nav-item ms-2">
              <button class="btn btn-sm btn-link text-secondary p-1" @click="$emit('toggle-theme')" :title="theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'">
                <i :class="theme === 'light' ? 'bi bi-moon-fill' : 'bi bi-sun-fill'"></i>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  `
}
