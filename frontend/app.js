import Navbar from './components/Navbar.js';
import Login from './components/Login.js';
import RegisterStudent from './components/RegisterStudent.js';
import RegisterCompany from './components/RegisterCompany.js';
import AdminDashboard from './components/AdminDashboard.js';
import CompanyDashboard from './components/CompanyDashboard.js';
import Profile from './components/Profile.js';
import StudentDashboard from './components/StudentDashboard.js';

const { createApp } = Vue;

const app = createApp({
  components: {
    Navbar,
    Login,
    RegisterStudent,
    RegisterCompany,
    AdminDashboard,
    CompanyDashboard,
    Profile,
    StudentDashboard
  },
  data() {
    return {
      currentRoute: window.location.hash.slice(1) || '/',
      isAuthenticated: false,
      user: null,
      loading: true,
      theme: localStorage.getItem('theme') || 'light'
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
    applyTheme() {
      document.documentElement.setAttribute('data-bs-theme', this.theme);
    },
    toggleTheme() {
      this.theme = this.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', this.theme);
      this.applyTheme();
    },
    async checkSession() {
      if (!sessionStorage.getItem('isLoggedIn')) {
        this.isAuthenticated = false;
        this.user = null;
        try {
          await fetch('/auth/logout', { method: 'POST' });
        } catch (e) {}
        this.loading = false;
        this.checkRouteProtection();
        return;
      }
      try {
        const response = await fetch('/auth/me');
        if (response.ok) {
          const result = await response.json();
          this.isAuthenticated = true;
          this.user = result.user;
        } else {
          this.isAuthenticated = false;
          this.user = null;
          sessionStorage.removeItem('isLoggedIn');
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
        sessionStorage.removeItem('isLoggedIn');
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
      sessionStorage.setItem('isLoggedIn', 'true');
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
    this.applyTheme();
    // Sync initial session on mount
    this.checkSession();

    // Listen to hash changes
    window.addEventListener('hashchange', () => {
      this.currentRoute = window.location.hash.slice(1) || '/';
    });

    // Heartbeat sleep checker
    let lastHeartbeat = Date.now();
    setInterval(() => {
      const now = Date.now();
      if (now - lastHeartbeat > 300000) { // 5 minutes threshold
        // Laptop went to sleep or page suspended
        this.logout();
      }
      lastHeartbeat = now;
    }, 10000);

    // Visibility change listener to catch wake-up immediately
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        if (now - lastHeartbeat > 300000) {
          this.logout();
        }
      }
    });
  },
  template: `
    <div>
      <Navbar :user="user" :is-authenticated="isAuthenticated" :theme="theme" @logout="logout" @navigate="navigate" @toggle-theme="toggleTheme" />
      
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

        <!-- Protected Profile Page (Shared) -->
        <Profile v-else-if="currentRoute === '/student/profile' || currentRoute === '/company/profile'" :user="user" @profile-updated="checkSession" />

        <!-- Protected Student Dashboard -->
        <StudentDashboard v-else-if="currentRoute.startsWith('/student')" :user="user" :current-route="currentRoute" />

        <!-- Protected Company Dashboard -->
        <CompanyDashboard v-else-if="currentRoute.startsWith('/company')" :user="user" :current-route="currentRoute" @navigate="navigate" />

        <!-- Protected Admin Dashboard -->
        <AdminDashboard v-else-if="currentRoute.startsWith('/admin')" :user="user" :current-route="currentRoute" @navigate="navigate" />
        
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
