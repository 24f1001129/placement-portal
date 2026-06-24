import Navbar from './components/Navbar.js';
import Login from './components/Login.js';
import RegisterStudent from './components/RegisterStudent.js';
import RegisterCompany from './components/RegisterCompany.js';
import AdminDashboard from './components/AdminDashboard.js';
import CompanyDashboard from './components/CompanyDashboard.js';

const { createApp } = Vue;

const app = createApp({
  components: {
    Navbar,
    Login,
    RegisterStudent,
    RegisterCompany,
    AdminDashboard,
    CompanyDashboard
  },
  data() {
    return {
      currentRoute: window.location.hash.slice(1) || '/',
      isAuthenticated: false,
      user: null,
      loading: true
    }
  },
  watch: {
    currentRoute(newRoute) {
      if (window.location.hash.slice(1) !== newRoute) {
        window.location.hash = newRoute;
      }
      this.checkRouteProtection();
    }
  },
  methods: {
    navigate(route) {
      this.currentRoute = route;
    },
    async checkSession() {
      try {
        const response = await fetch('/auth/me');
        if (response.ok) {
          const result = await response.json();
          this.isAuthenticated = true;
          this.user = result.user;
        } else {
          this.isAuthenticated = false;
          this.user = null;
        }
      } catch (err) {
        console.error('Session sync error:', err);
        this.isAuthenticated = false;
        this.user = null;
      } finally {
        this.loading = false;
        this.checkRouteProtection();
      }
    },
    async logout() {
      try {
        const response = await fetch('/auth/logout', { method: 'POST' });
        if (response.ok) {
          this.isAuthenticated = false;
          this.user = null;
          this.navigate('/login');
        }
      } catch (err) {
        console.error('Logout error:', err);
      }
    },
    handleLoginSuccess(userData) {
      this.isAuthenticated = true;
      this.user = userData;
    },
    redirectToDashboard() {
      if (!this.user) return;
      if (this.user.role === 'STUDENT') this.navigate('/student/dashboard');
      else if (this.user.role === 'COMPANY') this.navigate('/company/dashboard');
      else if (this.user.role === 'ADMIN') this.navigate('/admin/dashboard');
    },
    checkRouteProtection() {
      const route = this.currentRoute;

      // Guest pages
      if (['/', '/login', '/register/student', '/register/company'].includes(route)) {
        if (this.isAuthenticated) {
          this.redirectToDashboard();
        }
        return;
      }

      // Protected pages
      if (!this.isAuthenticated) {
        this.navigate('/login');
        return;
      }

      // Role checks
      if (route.startsWith('/student') && (!this.user || this.user.role !== 'STUDENT')) {
        this.redirectToDashboard();
      } else if (route.startsWith('/company') && (!this.user || this.user.role !== 'COMPANY')) {
        this.redirectToDashboard();
      } else if (route.startsWith('/admin') && (!this.user || this.user.role !== 'ADMIN')) {
        this.redirectToDashboard();
      }
    }
  },
  created() {
    // Sync initial session on mount
    this.checkSession();

    // Listen to hash changes
    window.addEventListener('hashchange', () => {
      this.currentRoute = window.location.hash.slice(1) || '/';
    });
  },
  template: `
    <div>
      <Navbar :user="user" :is-authenticated="isAuthenticated" @logout="logout" @navigate="navigate" />
      
      <div v-if="loading" class="d-flex justify-content-center align-items-center" style="min-height: 80vh;">
        <div class="spinner-border" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>
      
      <main v-else class="container my-4">
        <!-- Landing Page -->
        <div v-if="currentRoute === '/'" class="row justify-content-center my-5">
          <div class="col-12 col-md-8 text-center p-4 border rounded">
            <h1 class="fw-bold">Placement Portal</h1>
            <p class="text-muted">A minimal and clean platform to coordinate campus placements, interview drives, and student records.</p>
            <div class="mt-4">
              <button class="btn btn-primary me-2" @click="navigate('/login')">Get Started</button>
              <button class="btn btn-outline-secondary" @click="navigate('/register/student')">Student Sign Up</button>
            </div>
          </div>
        </div>

        <!-- Auth Pages -->
        <Login v-else-if="currentRoute === '/login'" @login-success="handleLoginSuccess" @navigate="navigate" />
        <RegisterStudent v-else-if="currentRoute === '/register/student'" @navigate="navigate" />
        <RegisterCompany v-else-if="currentRoute === '/register/company'" @navigate="navigate" />

        <!-- Protected Student Dashboard (Placeholder) -->
        <div v-else-if="currentRoute.startsWith('/student')" class="card p-4 border rounded">
          <h2 class="fw-bold">Student Dashboard</h2>
          <p class="text-muted">Welcome, {{ user?.name }} ({{ user?.email }})</p>
          <div class="badge bg-success d-inline-block my-2" style="max-width: fit-content;">Authenticated Student</div>
        </div>

        <!-- Protected Company Dashboard -->
        <CompanyDashboard v-else-if="currentRoute.startsWith('/company')" :user="user" :current-route="currentRoute" @navigate="navigate" />

        <!-- Protected Admin Dashboard -->
        <AdminDashboard v-else-if="currentRoute.startsWith('/admin')" :user="user" @navigate="navigate" />
        
        <!-- 404 Route Fallback -->
        <div v-else class="text-center py-5">
          <h1 class="display-3 fw-bold">404</h1>
          <p class="fs-5 text-muted">Page not found</p>
          <button class="btn btn-primary mt-3" @click="navigate('/')">Go to Home</button>
        </div>
      </main>
    </div>
  `
});

app.mount('#app');
