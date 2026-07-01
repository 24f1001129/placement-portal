export default {
  name: 'RegisterStudent',
  emits: ['navigate'],
  data() {
    return {
      email: '',
      password: '',
      confirmPassword: '',
      full_name: '',
      branch: '',
      cgpa: null,
      grad_year: null,
      phone: '',
      skills: '',
      experience: '',
      github_url: '',
      linkedin_url: '',
      portfolio_url: '',
      error: '',
      success: '',
      loading: false,
      resumeFile: null
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
      if (this.cgpa < 0.0 || this.cgpa > 10.0) {
        this.error = 'CGPA must be between 0.0 and 10.0.';
        return false;
      }
      if (!/^\d{10}$/.test(this.phone)) {
        this.error = 'Phone number must be exactly 10 digits.';
        return false;
      }
      if (!this.github_url.startsWith('https://github.com/')) {
        this.error = 'GitHub URL must start with https://github.com/';
        return false;
      }
      if (!this.linkedin_url.startsWith('https://www.linkedin.com/in/')) {
        this.error = 'LinkedIn URL must start with https://www.linkedin.com/in/';
        return false;
      }
      return true;
    },
    async handleSubmit() {
      if (!this.validateForm()) {
        return;
      }
      
      if (!this.resumeFile) {
        this.error = 'Please upload a PDF resume.';
        return;
      }
      
      this.error = '';
      this.success = '';
      this.loading = true;
      
      try {
        const formData = new FormData();
        formData.append('email', this.email);
        formData.append('password', this.password);
        formData.append('full_name', this.full_name);
        formData.append('branch', this.branch);
        formData.append('cgpa', this.cgpa);
        formData.append('grad_year', this.grad_year);
        formData.append('phone', this.phone);
        formData.append('skills', this.skills);
        formData.append('experience', this.experience);
        formData.append('github_url', this.github_url);
        formData.append('linkedin_url', this.linkedin_url);
        formData.append('portfolio_url', this.portfolio_url);
        formData.append('resume', this.resumeFile);
        
        const response = await fetch('/auth/register/student', {
          method: 'POST',
          body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
          this.success = 'Registration successful! Redirecting to login...';
          setTimeout(() => {
            this.handleNav('/login');
          }, 2000);
        } else {
          this.error = result.error || 'Registration failed. Please check your inputs.';
        }
      } catch (err) {
        this.error = 'Server connection failed. Please try again.';
      } finally {
        this.loading = false;
      }
    },
    handleFileUpload(event) {
      this.resumeFile = event.target.files[0];
    }
  },
  template: `
    <div class="container my-4">
      <div class="row justify-content-center">
        <div class="col-12 col-md-10 col-lg-8">
          <div class="card p-4 border rounded">
            <h3 class="fw-bold mb-3 text-center">Student Registration</h3>
            
            <div v-if="error" class="alert alert-danger p-2 mb-3 small">{{ error }}</div>
            <div v-if="success" class="alert alert-success p-2 mb-3 small">{{ success }}</div>
            
            <form @submit.prevent="handleSubmit">
              <h5 class="fw-bold mb-3 mt-2">Account Details</h5>
              
              <div class="row mb-3">
                <div class="col-md-6 mb-3 mb-md-0">
                  <label class="form-label small fw-bold">Email Address</label>
                  <input type="email" v-model="email" class="form-control" placeholder="name@institute.com" required />
                </div>
                <div class="col-md-6">
                  <label class="form-label small fw-bold">Phone Number</label>
                  <input type="tel" v-model="phone" class="form-control" placeholder="10-digit number" required />
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
              
              <h5 class="fw-bold mb-3 mt-4">Academic Details</h5>
              
              <div class="row mb-3">
                <div class="col-md-6 mb-3 mb-md-0">
                  <label class="form-label small fw-bold">Full Name</label>
                  <input type="text" v-model="full_name" class="form-control" placeholder="Full Name" required />
                </div>
                <div class="col-md-6">
                  <label class="form-label small fw-bold">Branch</label>
                  <select v-model="branch" class="form-select" required>
                    <option value="" disabled>Select Branch</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Data Science">Data Science</option>
                    <option value="Electrical Engineering">Electrical Engineering</option>
                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                    <option value="Civil Engineering">Civil Engineering</option>
                    <option value="Aerospace Engineering">Aerospace Engineering</option>
                    <option value="Chemical Engineering">Chemical Engineering</option>
                  </select>
                </div>
              </div>
              
              <div class="row mb-3">
                <div class="col-md-6 mb-3 mb-md-0">
                  <label class="form-label small fw-bold">CGPA (0.0 - 10.0)</label>
                  <input type="number" step="0.01" v-model="cgpa" class="form-control" placeholder="e.g. 8.5" required />
                </div>
                <div class="col-md-6">
                  <label class="form-label small fw-bold">Graduation Year</label>
                  <input type="number" v-model="grad_year" class="form-control" placeholder="e.g. 2026" required />
                </div>
              </div>
              
              <h5 class="fw-bold mb-3 mt-4">Professional Profiles</h5>
              
              <div class="row mb-3">
                <div class="col-md-6 mb-3 mb-md-0">
                  <label class="form-label small fw-bold">Skills (comma separated)</label>
                  <input type="text" v-model="skills" class="form-control" placeholder="e.g. Python, SQL" required />
                </div>
                <div class="col-md-6">
                  <label class="form-label small fw-bold">Resume (PDF)</label>
                  <input type="file" accept=".pdf" @change="handleFileUpload" class="form-control" required />
                </div>
              </div>
              
              <div class="row mb-3">
                <div class="col-md-6 mb-3 mb-md-0">
                  <label class="form-label small fw-bold">GitHub Profile URL</label>
                  <input type="url" v-model="github_url" class="form-control" placeholder="https://github.com/username" required />
                </div>
                <div class="col-md-6">
                  <label class="form-label small fw-bold">LinkedIn Profile URL</label>
                  <input type="url" v-model="linkedin_url" class="form-control" placeholder="https://www.linkedin.com/in/username" required />
                </div>
              </div>
              
              <div class="mb-3">
                <label class="form-label small fw-bold">Portfolio URL (Optional)</label>
                <input type="url" v-model="portfolio_url" class="form-control" placeholder="https://username.dev" />
              </div>

              <div class="mb-3">
                <label class="form-label small fw-bold">Experience & Projects (Optional)</label>
                <textarea v-model="experience" rows="3" class="form-control" placeholder="Brief details about projects, internships, or work history..."></textarea>
              </div>

              <div class="d-flex gap-2 justify-content-end mt-4">
                <button type="button" class="btn btn-secondary px-4" @click="handleNav('/login')">Cancel</button>
                <button type="submit" class="btn btn-primary px-4" :disabled="loading">
                  <span v-if="loading" class="spinner-border spinner-border-sm me-2" role="status"></span>
                  <span>{{ loading ? 'Registering...' : 'Register' }}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `
}
