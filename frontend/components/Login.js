export default {
  name: 'Login',
  emits: ['login-success', 'navigate'],
  data() {
    return {
      email: '',
      password: '',
      error: '',
      loading: false
    }
  },
  methods: {
    handleNav(route) {
      this.$emit('navigate', route);
    },
    async handleSubmit() {
      if (!this.email || !this.password) {
        this.error = 'Please enter both email and password.';
        return;
      }
      
      this.error = '';
      this.loading = true;
      
      try {
        const response = await fetch('/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: this.email,
            password: this.password
          })
        });
        
        const result = await response.json();
        
        if (response.ok) {
          this.$emit('login-success', result.user);
          if (result.user.role === 'STUDENT') {
            this.handleNav('/student/dashboard');
          } else if (result.user.role === 'COMPANY') {
            this.handleNav('/company/dashboard');
          } else if (result.user.role === 'ADMIN') {
            this.handleNav('/admin/dashboard');
          }
        } else {
          this.error = result.error || 'Invalid credentials or inactive account.';
        }
      } catch (err) {
        this.error = 'Failed to connect to the server.';
      } finally {
        this.loading = false;
      }
    }
  },
  template: `
    <div class="container my-5">
      <div class="row justify-content-center">
        <div class="col-12 col-sm-10 col-md-8 col-lg-5">
          <div class="card p-4 border rounded-3">
            <h3 class="fw-bold mb-3 text-center">Login</h3>
            
            <div v-if="error" class="alert alert-danger p-2 mb-3 small">{{ error }}</div>
            
            <form @submit.prevent="handleSubmit">
              <div class="mb-3">
                <label class="form-label small fw-bold">Email Address</label>
                <input 
                  type="email" 
                  v-model="email" 
                  class="form-control" 
                  placeholder="name@institute.com" 
                  required
                />
              </div>
              
              <div class="mb-3">
                <label class="form-label small fw-bold">Password</label>
                <input 
                  type="password" 
                  v-model="password" 
                  class="form-control" 
                  placeholder="Password" 
                  required
                />
              </div>
              
              <button 
                type="submit" 
                class="btn btn-primary w-100 py-2 mt-2"
                :disabled="loading"
              >
                <span v-if="loading" class="spinner-border spinner-border-sm me-2" role="status"></span>
                <span>{{ loading ? 'Logging In...' : 'Login' }}</span>
              </button>
            </form>
            
            <div class="mt-4 text-center small text-muted">
              <span>Don't have an account? </span>
              <div class="mt-2">
                <a href="#/register/student" class="text-primary text-decoration-none mx-2" @click.prevent="handleNav('/register/student')">Register Student</a>
                <span>|</span>
                <a href="#/register/company" class="text-primary text-decoration-none mx-2" @click.prevent="handleNav('/register/company')">Register Recruiter</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
}
