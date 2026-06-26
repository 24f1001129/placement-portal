const Profile = {
  props: {
    user: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      profileData: {},
      resumeFile: null,
      loading: false,
      uploading: false,
      successMessage: '',
      errorMessage: ''
    }
  },
  methods: {
    async fetchProfile() {
      this.loading = true;
      try {
        const res = await fetch('/auth/me');
        if (res.ok) {
          const result = await res.json();
          this.profileData = { ...result.user.details, full_name: result.user.name, company_name: result.user.name };
        } else {
          this.errorMessage = 'Failed to load profile details.';
        }
      } catch (err) {
        this.errorMessage = 'Network error loading profile.';
      } finally {
        this.loading = false;
      }
    },
    async saveProfile() {
      this.clearMessages();
      this.loading = true;
      try {
        const res = await fetch('/auth/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.profileData)
        });
        const result = await res.json();
        if (res.ok) {
          this.successMessage = 'Profile updated successfully.';
          this.$emit('profile-updated');
        } else {
          this.errorMessage = result.error || 'Failed to update profile.';
        }
      } catch (err) {
        this.errorMessage = 'Network error saving profile.';
      } finally {
        this.loading = false;
      }
    },
    handleFileChange(event) {
      this.resumeFile = event.target.files[0];
    },
    async uploadResume() {
      if (!this.resumeFile) return;
      this.clearMessages();
      this.uploading = true;
      
      const formData = new FormData();
      formData.append('resume', this.resumeFile);

      try {
        const res = await fetch('/student/upload_resume', {
          method: 'POST',
          body: formData
        });
        const result = await res.json();
        if (res.ok) {
          this.profileData.resume_path = result.resume_url;
          this.successMessage = 'Resume PDF uploaded successfully.';
          this.resumeFile = null;
          this.$refs.fileInput.value = '';
        } else {
          this.errorMessage = result.error || 'Failed to upload resume.';
        }
      } catch (err) {
        this.errorMessage = 'Network error uploading resume.';
      } finally {
        this.uploading = false;
      }
    },
    clearMessages() {
      this.successMessage = '';
      this.errorMessage = '';
    }
  },
  created() {
    this.fetchProfile();
  },
  template: `
    <div class="row justify-content-center">
      <div class="col-12 col-lg-8">
        <!-- Profile Card -->
        <div class="card mb-4">
          <div class="card-header d-flex justify-content-between align-items-center">
            <div>
              <h4 class="mb-0">Profile Settings</h4>
            </div>
            <span class="badge bg-secondary">
              {{ user.role }} Account
            </span>
          </div>
          
          <div class="card-body">
            <div v-if="successMessage" class="alert alert-success py-2" role="alert">
              {{ successMessage }}
            </div>
            
            <div v-if="errorMessage" class="alert alert-danger py-2" role="alert">
              {{ errorMessage }}
            </div>

            <!-- Loader -->
            <div v-if="loading && !profileData.full_name && !profileData.company_name" class="text-center py-4">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
            </div>

            <form v-else @submit.prevent="saveProfile">
              <!-- STUDENT PROFILE FORM -->
              <div v-if="user.role === 'STUDENT'" class="row g-3">
                <div class="col-md-6">
                  <label class="form-label small text-muted">Full Name</label>
                  <input type="text" v-model="profileData.full_name" class="form-control form-control-sm" required />
                </div>
                
                <div class="col-md-6">
                  <label class="form-label small text-muted">Email Address</label>
                  <input type="email" :value="user.email" class="form-control form-control-sm bg-light" readonly />
                </div>

                <div class="col-md-4">
                  <label class="form-label small text-muted">Branch / Specialization</label>
                  <input type="text" v-model="profileData.branch" class="form-control form-control-sm" required />
                </div>

                <div class="col-md-4">
                  <label class="form-label small text-muted">CGPA</label>
                  <input type="number" step="0.01" min="0" max="10" v-model="profileData.cgpa" class="form-control form-control-sm" required />
                </div>

                <div class="col-md-4">
                  <label class="form-label small text-muted">Graduation Year</label>
                  <input type="number" v-model="profileData.grad_year" class="form-control form-control-sm" required />
                </div>

                <div class="col-md-6">
                  <label class="form-label small text-muted">Phone Number (10 digits)</label>
                  <input type="tel" pattern="[0-9]{10}" v-model="profileData.phone" class="form-control form-control-sm" required />
                </div>

                <div class="col-md-6">
                  <label class="form-label small text-muted">Portfolio URL (Optional)</label>
                  <input type="url" v-model="profileData.portfolio_url" class="form-control form-control-sm" />
                </div>

                <div class="col-md-6">
                  <label class="form-label small text-muted">GitHub Profile URL</label>
                  <input type="url" placeholder="https://github.com/username" v-model="profileData.github_url" class="form-control form-control-sm" required />
                </div>

                <div class="col-md-6">
                  <label class="form-label small text-muted">LinkedIn Profile URL</label>
                  <input type="url" placeholder="https://www.linkedin.com/in/username" v-model="profileData.linkedin_url" class="form-control form-control-sm" required />
                </div>

                <div class="col-12">
                  <label class="form-label small text-muted">Core Skills (Comma separated)</label>
                  <input type="text" placeholder="Python, JavaScript, SQL" v-model="profileData.skills" class="form-control form-control-sm" required />
                </div>

                <div class="col-12">
                  <label class="form-label small text-muted">Experience Description</label>
                  <textarea rows="3" placeholder="Brief details about internships, projects, or work history..." v-model="profileData.experience" class="form-control form-control-sm"></textarea>
                </div>
              </div>

              <!-- COMPANY PROFILE FORM -->
              <div v-else-if="user.role === 'COMPANY'" class="row g-3">
                <div class="col-md-6">
                  <label class="form-label small text-muted">Company Name</label>
                  <input type="text" :value="profileData.company_name" class="form-control form-control-sm bg-light" readonly />
                </div>
                
                <div class="col-md-6">
                  <label class="form-label small text-muted">Recruiter Corporate Email</label>
                  <input type="email" :value="user.email" class="form-control form-control-sm bg-light" readonly />
                </div>

                <div class="col-md-6">
                  <label class="form-label small text-muted">Industry Sector</label>
                  <input type="text" v-model="profileData.industry" class="form-control form-control-sm" required />
                </div>

                <div class="col-md-6">
                  <label class="form-label small text-muted">Corporate Website URL</label>
                  <input type="url" v-model="profileData.website" class="form-control form-control-sm" required />
                </div>

                <div class="col-md-6">
                  <label class="form-label small text-muted">Headquarters Location</label>
                  <input type="text" v-model="profileData.location" class="form-control form-control-sm" required />
                </div>

                <div class="col-md-6">
                  <label class="form-label small text-muted">HR Recruiting Contact Info</label>
                  <input type="text" v-model="profileData.hr_contact" class="form-control form-control-sm" required />
                </div>

                <div class="col-12">
                  <label class="form-label small text-muted">Company Description</label>
                  <textarea rows="4" v-model="profileData.description" class="form-control form-control-sm" required></textarea>
                </div>
              </div>

              <!-- Submit Button -->
              <div class="mt-3 pt-3 border-top d-flex justify-content-end">
                <button type="submit" class="btn btn-sm btn-dark px-4" :disabled="loading">
                  <span v-if="loading" class="spinner-border spinner-border-sm me-2" role="status"></span>
                  Save Profile Details
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Resume Management Card (STUDENTS ONLY) -->
        <div v-if="user.role === 'STUDENT' && profileData.full_name" class="card">
          <div class="card-header">
            <h5 class="mb-0">Resume / CV Document</h5>
          </div>
          
          <div class="card-body">
            <div class="p-3 bg-light mb-3 border">
              <h6 class="mb-1">Current Resume</h6>
              <p class="mb-0 small">
                <span v-if="profileData.resume_path">
                  <a :href="profileData.resume_path" target="_blank" class="text-decoration-underline text-dark fw-bold">
                    View Uploaded PDF
                  </a>
                </span>
                <span v-else class="text-danger">No resume uploaded yet.</span>
              </p>
            </div>

            <div class="row align-items-end g-3">
              <div class="col-md-8 col-12">
                <label class="form-label small text-muted">Select Resume (PDF only)</label>
                <input type="file" ref="fileInput" accept=".pdf" @change="handleFileChange" class="form-control form-control-sm" />
              </div>
              <div class="col-md-4 col-12 d-grid">
                <button type="button" @click="uploadResume" class="btn btn-sm btn-outline-dark" :disabled="!resumeFile || uploading">
                  <span v-if="uploading" class="spinner-border spinner-border-sm me-2" role="status"></span>
                  Upload PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
};

export default Profile;
