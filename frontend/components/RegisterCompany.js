export default {
  name: 'RegisterCompany',
  emits: ['navigate'],
  data() {
    return {
      email: '',
      password: '',
      confirmPassword: '',
      company_name: '',
      industry: '',
      location: '',
      website: '',
      description: '',
      hr_contact: '',
      
      error: '',
      success: '',
      loading: false
    }
  },
  methods: {
    handleNav(route) {
      this.$emit('navigate', route);
    },
    validateForm() {
      if (this.password !== this.confirmPassword) {
        this.error = 'Passwords do not match.';
        return false;
      }
      if (!this.website.startsWith('http://') && !this.website.startsWith('https://')) {
        this.error = 'Website URL must start with http:// or https://';
        return false;
      }
      return true;
    },
    async handleSubmit() {
      if (!this.validateForm()) {
        return;
      }
      
      this.error = '';
      this.success = '';
      this.loading = true;
      
      try {
        const response = await fetch('/auth/register/company', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: this.email,
            password: this.password,
            company_name: this.company_name,
            industry: this.industry,
            location: this.location,
            website: this.website,
            description: this.description,
            hr_contact: this.hr_contact
          })
        });
        
        const result = await response.json();
        
        if (response.ok) {
          this.success = 'Registration profile submitted successfully! Redirecting to login...';
          setTimeout(() => {
            this.handleNav('/login');
          }, 2500);
        } else {
          this.error = result.error || 'Registration failed. Please check your inputs.';
        }
      } catch (err) {
        this.error = 'Server connection failed. Please try again.';
      } finally {
        this.loading = false;
      }
    }
  },
  template: `
    <div class="container my-4">
      <div class="row justify-content-center">
        <div class="col-12 col-md-10 col-lg-8">
          <div class="card p-4 border rounded">
            <h3 class="fw-bold mb-3 text-center">Recruiter Registration</h3>
            
            <div v-if="error" class="alert alert-danger p-2 mb-3 small">{{ error }}</div>
            <div v-if="success" class="alert alert-success p-2 mb-3 small">{{ success }}</div>
            
            <form @submit.prevent="handleSubmit">
              <h5 class="fw-bold mb-3 mt-2">Account Details</h5>
              
              <div class="row mb-3">
                <div class="col-md-6 mb-3 mb-md-0">
                  <label class="form-label small fw-bold">Email Address</label>
                  <input type="email" v-model="email" class="form-control" placeholder="recruiter@company.com" required />
                </div>
                <div class="col-md-6">
                  <label class="form-label small fw-bold">HR Contact (Email/Phone)</label>
                  <input type="text" v-model="hr_contact" class="form-control" placeholder="hr.contact@company.com" required />
                </div>
              </div>
              
              <div class="row mb-3">
                <div class="col-md-6 mb-3 mb-md-0">
                  <label class="form-label small fw-bold">Password</label>
                  <input type="password" v-model="password" class="form-control" placeholder="Password" required />
                </div>
                <div class="col-md-6">
                  <label class="form-label small fw-bold">Confirm Password</label>
                  <input type="password" v-model="confirmPassword" class="form-control" placeholder="Confirm Password" required />
                </div>
              </div>
              
              <h5 class="fw-bold mb-3 mt-4">Company Details</h5>
              
              <div class="row mb-3">
                <div class="col-md-6 mb-3 mb-md-0">
                  <label class="form-label small fw-bold">Company Name</label>
                  <input type="text" v-model="company_name" class="form-control" placeholder="Google Inc." required />
                </div>
                <div class="col-md-6">
                  <label class="form-label small fw-bold">Industry Type</label>
                  <select v-model="industry" class="form-select" required>
                    <option value="" disabled>Select Industry</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Finance / Banking">Finance / Banking</option>
                    <option value="Consulting">Consulting</option>
                    <option value="Core Engineering">Core Engineering</option>
                    <option value="Healthcare / Biotech">Healthcare / Biotech</option>
                    <option value="EdTech">EdTech</option>
                  </select>
                </div>
              </div>
              
              <div class="row mb-3">
                <div class="col-md-6 mb-3 mb-md-0">
                  <label class="form-label small fw-bold">Location</label>
                  <input type="text" v-model="location" class="form-control" placeholder="e.g. Bangalore, IN" required />
                </div>
                <div class="col-md-6">
                  <label class="form-label small fw-bold">Company Website URL</label>
                  <input type="url" v-model="website" class="form-control" placeholder="https://www.company.com" required />
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label small fw-bold">Company Description</label>
                <textarea v-model="description" rows="3" class="form-control" placeholder="Brief details about the company..." required></textarea>
              </div>

              <div class="alert alert-secondary p-2 mb-4 small">
                Recruiter registrations require validation by the Placement Cell Admin before access is allowed to the dashboard.
              </div>

              <div class="d-flex gap-2 justify-content-end">
                <button type="button" class="btn btn-secondary px-4" @click="handleNav('/login')">Cancel</button>
                <button type="submit" class="btn btn-primary px-4" :disabled="loading">
                  <span v-if="loading" class="spinner-border spinner-border-sm me-2" role="status"></span>
                  <span>{{ loading ? 'Submitting...' : 'Register' }}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `
}
