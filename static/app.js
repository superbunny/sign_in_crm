// ==================== STATE ====================
let departments = [];
let applications = [];
let integrations = [];
let contacts = [];
let activities = [];
let incidents = [];

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    // Load initial data
    loadDashboard();
    loadAllData();

    // Navigation handlers
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => switchView(btn.dataset.view));
    });

    // Chat handlers
    document.getElementById('chat-send').addEventListener('click', sendChatMessage);
    document.getElementById('chat-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendChatMessage();
    });

    // Initialize chat buttons (clear/new chat)
    initChatButtons();
});

// ==================== VIEW NAVIGATION ====================
function switchView(viewName) {
    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    // Update views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.toggle('active', view.id === `view-${viewName}`);
    });

    // Load data for the view
    switch (viewName) {
        case 'dashboard': loadDashboard(); break;
        case 'departments': renderDepartments(); break;
        case 'applications': renderApplications(); break;
        case 'integrations': renderIntegrations(); break;
        case 'contacts': renderContacts(); break;
        case 'activities': renderActivities(); break;
        case 'incidents': renderIncidents(); break;
    }
}

// ==================== API CALLS ====================
async function apiCall(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (data) options.body = JSON.stringify(data);

    const response = await fetch(`/api/${endpoint}`, options);
    return response.json();
}

async function loadAllData() {
    try {
        [departments, applications, integrations, contacts, activities, incidents] = await Promise.all([
            apiCall('departments'),
            apiCall('applications'),
            apiCall('integrations'),
            apiCall('contacts'),
            apiCall('activities'),
            apiCall('incidents')
        ]);
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// ==================== DASHBOARD ====================
async function loadDashboard() {
    try {
        const data = await apiCall('dashboard');

        document.getElementById('stat-total-departments').textContent = data.departments.total;
        document.getElementById('stat-active-departments').textContent = data.departments.active;
        document.getElementById('stat-critical-departments').textContent = data.departments.critical;

        document.getElementById('stat-total-applications').textContent = data.applications.total;
        document.getElementById('stat-live-applications').textContent = data.applications.live;
        document.getElementById('stat-integrating-applications').textContent = data.applications.integrating;

        document.getElementById('stat-high-risk').textContent = data.risk.high_risk;
        document.getElementById('stat-blocked').textContent = data.risk.blocked;
        document.getElementById('stat-delayed').textContent = data.risk.delayed;

        document.getElementById('stat-open-incidents').textContent = data.incidents.open;
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// ==================== DEPARTMENTS ====================
function renderDepartments() {
    const tbody = document.querySelector('#departments-table tbody');
    tbody.innerHTML = departments.map(d => `
        <tr>
            <td><strong>${d.name}</strong></td>
            <td>${d.short_name || '-'}</td>
            <td><span class="badge badge-${d.tier}">${d.tier}</span></td>
            <td><span class="badge badge-${d.status}">${d.status}</span></td>
            <td>${d.owner_team || '-'}</td>
            <td>${d.app_count || 0}</td>
            <td class="action-btns">
                <button class="btn btn-secondary btn-sm" onclick="editDepartment(${d.department_id})">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteDepartment(${d.department_id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

function showAddDepartmentModal() {
    showModal('Add Department', `
        <form id="department-form">
            <div class="form-group">
                <label>Name *</label>
                <input type="text" name="name" required>
            </div>
            <div class="form-group">
                <label>Short Name</label>
                <input type="text" name="short_name">
            </div>
            <div class="form-group">
                <label>Tier</label>
                <select name="tier">
                    <option value="standard">Standard</option>
                    <option value="critical">Critical</option>
                </select>
            </div>
            <div class="form-group">
                <label>Status</label>
                <select name="status">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                </select>
            </div>
            <div class="form-group">
                <label>Owner Team</label>
                <input type="text" name="owner_team">
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Save</button>
            </div>
        </form>
    `);

    document.getElementById('department-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);
        await apiCall('departments', 'POST', data);
        closeModal();
        await loadAllData();
        renderDepartments();
        loadDashboard();
    });
}

async function editDepartment(id) {
    const dept = departments.find(d => d.department_id === id);
    if (!dept) return;

    showModal('Edit Department', `
        <form id="department-form">
            <div class="form-group">
                <label>Name *</label>
                <input type="text" name="name" value="${dept.name}" required>
            </div>
            <div class="form-group">
                <label>Short Name</label>
                <input type="text" name="short_name" value="${dept.short_name || ''}">
            </div>
            <div class="form-group">
                <label>Tier</label>
                <select name="tier">
                    <option value="standard" ${dept.tier === 'standard' ? 'selected' : ''}>Standard</option>
                    <option value="critical" ${dept.tier === 'critical' ? 'selected' : ''}>Critical</option>
                </select>
            </div>
            <div class="form-group">
                <label>Status</label>
                <select name="status">
                    <option value="active" ${dept.status === 'active' ? 'selected' : ''}>Active</option>
                    <option value="inactive" ${dept.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                </select>
            </div>
            <div class="form-group">
                <label>Owner Team</label>
                <input type="text" name="owner_team" value="${dept.owner_team || ''}">
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Save</button>
            </div>
        </form>
    `);

    document.getElementById('department-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);
        await apiCall(`departments/${id}`, 'PUT', data);
        closeModal();
        await loadAllData();
        renderDepartments();
    });
}

async function deleteDepartment(id) {
    if (!confirm('Are you sure you want to delete this department? This will also delete all associated applications, contacts, and activities.')) return;
    await apiCall(`departments/${id}`, 'DELETE');
    await loadAllData();
    renderDepartments();
    loadDashboard();
}

// ==================== APPLICATIONS ====================
function renderApplications() {
    const tbody = document.querySelector('#applications-table tbody');
    tbody.innerHTML = applications.map(a => `
        <tr>
            <td><strong>${a.app_name}</strong></td>
            <td>${a.department_name || '-'}</td>
            <td><span class="badge badge-${a.environment}">${a.environment}</span></td>
            <td>${a.auth_type}</td>
            <td><span class="badge badge-${a.status}">${a.status}</span></td>
            <td>${a.go_live_date || '-'}</td>
            <td class="action-btns">
                <button class="btn btn-secondary btn-sm" onclick="editApplication(${a.app_id})">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteApplication(${a.app_id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

function showAddApplicationModal() {
    const deptOptions = departments.map(d => `<option value="${d.department_id}">${d.name}</option>`).join('');

    showModal('Add Application', `
        <form id="application-form">
            <div class="form-group">
                <label>Department *</label>
                <select name="department_id" required>${deptOptions}</select>
            </div>
            <div class="form-group">
                <label>Application Name *</label>
                <input type="text" name="app_name" required>
            </div>
            <div class="form-group">
                <label>Environment</label>
                <select name="environment">
                    <option value="prod">Production</option>
                    <option value="test">Test</option>
                </select>
            </div>
            <div class="form-group">
                <label>Auth Type</label>
                <select name="auth_type">
                    <option value="OIDC">OIDC</option>
                    <option value="SAML">SAML</option>
                    <option value="legacy">Legacy</option>
                </select>
            </div>
            <div class="form-group">
                <label>Status</label>
                <select name="status">
                    <option value="integrating">Integrating</option>
                    <option value="live">Live</option>
                    <option value="deprecated">Deprecated</option>
                </select>
            </div>
            <div class="form-group">
                <label>Go-Live Date</label>
                <input type="date" name="go_live_date">
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Save</button>
            </div>
        </form>
    `);

    document.getElementById('application-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);
        await apiCall('applications', 'POST', data);
        closeModal();
        await loadAllData();
        renderApplications();
        loadDashboard();
    });
}

async function editApplication(id) {
    const app = applications.find(a => a.app_id === id);
    if (!app) return;

    const deptOptions = departments.map(d =>
        `<option value="${d.department_id}" ${d.department_id === app.department_id ? 'selected' : ''}>${d.name}</option>`
    ).join('');

    showModal('Edit Application', `
        <form id="application-form">
            <div class="form-group">
                <label>Department *</label>
                <select name="department_id" required>${deptOptions}</select>
            </div>
            <div class="form-group">
                <label>Application Name *</label>
                <input type="text" name="app_name" value="${app.app_name}" required>
            </div>
            <div class="form-group">
                <label>Environment</label>
                <select name="environment">
                    <option value="prod" ${app.environment === 'prod' ? 'selected' : ''}>Production</option>
                    <option value="test" ${app.environment === 'test' ? 'selected' : ''}>Test</option>
                </select>
            </div>
            <div class="form-group">
                <label>Auth Type</label>
                <select name="auth_type">
                    <option value="OIDC" ${app.auth_type === 'OIDC' ? 'selected' : ''}>OIDC</option>
                    <option value="SAML" ${app.auth_type === 'SAML' ? 'selected' : ''}>SAML</option>
                    <option value="legacy" ${app.auth_type === 'legacy' ? 'selected' : ''}>Legacy</option>
                </select>
            </div>
            <div class="form-group">
                <label>Status</label>
                <select name="status">
                    <option value="integrating" ${app.status === 'integrating' ? 'selected' : ''}>Integrating</option>
                    <option value="live" ${app.status === 'live' ? 'selected' : ''}>Live</option>
                    <option value="deprecated" ${app.status === 'deprecated' ? 'selected' : ''}>Deprecated</option>
                </select>
            </div>
            <div class="form-group">
                <label>Go-Live Date</label>
                <input type="date" name="go_live_date" value="${app.go_live_date || ''}">
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Save</button>
            </div>
        </form>
    `);

    document.getElementById('application-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);
        await apiCall(`applications/${id}`, 'PUT', data);
        closeModal();
        await loadAllData();
        renderApplications();
    });
}

async function deleteApplication(id) {
    if (!confirm('Are you sure you want to delete this application?')) return;
    await apiCall(`applications/${id}`, 'DELETE');
    await loadAllData();
    renderApplications();
    loadDashboard();
}

// ==================== INTEGRATIONS ====================
function renderIntegrations() {
    const tbody = document.querySelector('#integrations-table tbody');
    tbody.innerHTML = integrations.map(i => `
        <tr>
            <td><strong>${i.app_name || '-'}</strong></td>
            <td>${i.department_name || '-'}</td>
            <td><span class="badge badge-${i.stage}">${i.stage}</span></td>
            <td><span class="badge badge-${i.status}">${i.status.replace('_', ' ')}</span></td>
            <td><span class="badge badge-${i.risk_level}">${i.risk_level}</span></td>
            <td>${i.last_updated ? new Date(i.last_updated).toLocaleDateString() : '-'}</td>
            <td>${i.notes || '-'}</td>
            <td class="action-btns">
                <button class="btn btn-secondary btn-sm" onclick="editIntegration(${i.integration_id})">Update</button>
            </td>
        </tr>
    `).join('');
}

async function editIntegration(id) {
    const integ = integrations.find(i => i.integration_id === id);
    if (!integ) return;

    showModal('Update Integration Status', `
        <form id="integration-form">
            <p><strong>Application:</strong> ${integ.app_name}</p>
            <p><strong>Department:</strong> ${integ.department_name}</p>
            <hr style="margin: 1rem 0;">
            <div class="form-group">
                <label>Stage</label>
                <select name="stage">
                    <option value="intake" ${integ.stage === 'intake' ? 'selected' : ''}>Intake</option>
                    <option value="design" ${integ.stage === 'design' ? 'selected' : ''}>Design</option>
                    <option value="implementation" ${integ.stage === 'implementation' ? 'selected' : ''}>Implementation</option>
                    <option value="testing" ${integ.stage === 'testing' ? 'selected' : ''}>Testing</option>
                    <option value="production" ${integ.stage === 'production' ? 'selected' : ''}>Production</option>
                </select>
            </div>
            <div class="form-group">
                <label>Status</label>
                <select name="status">
                    <option value="on_track" ${integ.status === 'on_track' ? 'selected' : ''}>On Track</option>
                    <option value="blocked" ${integ.status === 'blocked' ? 'selected' : ''}>Blocked</option>
                    <option value="delayed" ${integ.status === 'delayed' ? 'selected' : ''}>Delayed</option>
                </select>
            </div>
            <div class="form-group">
                <label>Risk Level</label>
                <select name="risk_level">
                    <option value="low" ${integ.risk_level === 'low' ? 'selected' : ''}>Low</option>
                    <option value="medium" ${integ.risk_level === 'medium' ? 'selected' : ''}>Medium</option>
                    <option value="high" ${integ.risk_level === 'high' ? 'selected' : ''}>High</option>
                </select>
            </div>
            <div class="form-group">
                <label>Notes</label>
                <textarea name="notes">${integ.notes || ''}</textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Save</button>
            </div>
        </form>
    `);

    document.getElementById('integration-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);
        await apiCall(`integrations/${id}`, 'PUT', data);
        closeModal();
        await loadAllData();
        renderIntegrations();
        loadDashboard();
    });
}

// ==================== CONTACTS ====================
function renderContacts() {
    const tbody = document.querySelector('#contacts-table tbody');
    tbody.innerHTML = contacts.map(c => `
        <tr>
            <td><strong>${c.name}</strong></td>
            <td>${c.department_name || '-'}</td>
            <td><span class="badge badge-${c.role}">${c.role || '-'}</span></td>
            <td><a href="mailto:${c.email}">${c.email || '-'}</a></td>
            <td>${c.phone || '-'}</td>
            <td><span class="badge badge-${c.active_flag ? 'active' : 'inactive'}">${c.active_flag ? 'Yes' : 'No'}</span></td>
            <td class="action-btns">
                <button class="btn btn-secondary btn-sm" onclick="editContact(${c.contact_id})">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteContact(${c.contact_id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

function showAddContactModal() {
    const deptOptions = departments.map(d => `<option value="${d.department_id}">${d.name}</option>`).join('');

    showModal('Add Contact', `
        <form id="contact-form">
            <div class="form-group">
                <label>Department *</label>
                <select name="department_id" required>${deptOptions}</select>
            </div>
            <div class="form-group">
                <label>Name *</label>
                <input type="text" name="name" required>
            </div>
            <div class="form-group">
                <label>Role</label>
                <select name="role">
                    <option value="business">Business</option>
                    <option value="technical">Technical</option>
                    <option value="security">Security</option>
                </select>
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" name="email">
            </div>
            <div class="form-group">
                <label>Phone</label>
                <input type="tel" name="phone">
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Save</button>
            </div>
        </form>
    `);

    document.getElementById('contact-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);
        await apiCall('contacts', 'POST', data);
        closeModal();
        await loadAllData();
        renderContacts();
    });
}

async function editContact(id) {
    const contact = contacts.find(c => c.contact_id === id);
    if (!contact) return;

    const deptOptions = departments.map(d =>
        `<option value="${d.department_id}" ${d.department_id === contact.department_id ? 'selected' : ''}>${d.name}</option>`
    ).join('');

    showModal('Edit Contact', `
        <form id="contact-form">
            <div class="form-group">
                <label>Department *</label>
                <select name="department_id" required>${deptOptions}</select>
            </div>
            <div class="form-group">
                <label>Name *</label>
                <input type="text" name="name" value="${contact.name}" required>
            </div>
            <div class="form-group">
                <label>Role</label>
                <select name="role">
                    <option value="business" ${contact.role === 'business' ? 'selected' : ''}>Business</option>
                    <option value="technical" ${contact.role === 'technical' ? 'selected' : ''}>Technical</option>
                    <option value="security" ${contact.role === 'security' ? 'selected' : ''}>Security</option>
                </select>
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" name="email" value="${contact.email || ''}">
            </div>
            <div class="form-group">
                <label>Phone</label>
                <input type="tel" name="phone" value="${contact.phone || ''}">
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Save</button>
            </div>
        </form>
    `);

    document.getElementById('contact-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);
        await apiCall(`contacts/${id}`, 'PUT', data);
        closeModal();
        await loadAllData();
        renderContacts();
    });
}

async function deleteContact(id) {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    await apiCall(`contacts/${id}`, 'DELETE');
    await loadAllData();
    renderContacts();
}

// ==================== ACTIVITIES ====================
function renderActivities() {
    const tbody = document.querySelector('#activities-table tbody');
    tbody.innerHTML = activities.map(a => `
        <tr>
            <td>${a.date || '-'}</td>
            <td><span class="badge badge-${a.type}">${a.type}</span></td>
            <td><strong>${a.department_name || '-'}</strong></td>
            <td>${a.app_name || '-'}</td>
            <td>${a.summary || '-'}</td>
            <td>${a.next_action || '-'}</td>
            <td>${a.owner || '-'}</td>
            <td class="action-btns">
                <button class="btn btn-secondary btn-sm" onclick="editActivity(${a.activity_id})">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteActivity(${a.activity_id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

async function editActivity(id) {
    const activity = activities.find(a => a.activity_id === id);
    if (!activity) return;

    const deptOptions = departments.map(d =>
        `<option value="${d.department_id}" ${d.department_id === activity.department_id ? 'selected' : ''}>${d.name}</option>`
    ).join('');
    const appOptions = applications.map(a =>
        `<option value="${a.app_id}" ${a.app_id === activity.app_id ? 'selected' : ''}>${a.app_name} (${a.department_name})</option>`
    ).join('');

    showModal('Edit Activity', `
        <form id="activity-form">
            <div class="form-group">
                <label>Department *</label>
                <select name="department_id" required>${deptOptions}</select>
            </div>
            <div class="form-group">
                <label>Application (optional)</label>
                <select name="app_id">
                    <option value="">-- Select --</option>
                    ${appOptions}
                </select>
            </div>
            <div class="form-group">
                <label>Type *</label>
                <select name="type" required>
                    <option value="meeting" ${activity.type === 'meeting' ? 'selected' : ''}>Meeting</option>
                    <option value="email" ${activity.type === 'email' ? 'selected' : ''}>Email</option>
                    <option value="workshop" ${activity.type === 'workshop' ? 'selected' : ''}>Workshop</option>
                    <option value="incident" ${activity.type === 'incident' ? 'selected' : ''}>Incident</option>
                </select>
            </div>
            <div class="form-group">
                <label>Date</label>
                <input type="date" name="date" value="${activity.date || ''}">
            </div>
            <div class="form-group">
                <label>Summary *</label>
                <textarea name="summary" required>${activity.summary || ''}</textarea>
            </div>
            <div class="form-group">
                <label>Next Action</label>
                <input type="text" name="next_action" value="${activity.next_action || ''}">
            </div>
            <div class="form-group">
                <label>Owner</label>
                <input type="text" name="owner" value="${activity.owner || ''}">
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Save</button>
            </div>
        </form>
    `);

    document.getElementById('activity-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);
        if (!data.app_id) delete data.app_id;
        await apiCall(`activities/${id}`, 'PUT', data);
        closeModal();
        await loadAllData();
        renderActivities();
    });
}

async function deleteActivity(id) {
    if (!confirm('Are you sure you want to delete this activity?')) return;
    await apiCall(`activities/${id}`, 'DELETE');
    await loadAllData();
    renderActivities();
}

function showAddActivityModal() {
    const deptOptions = departments.map(d => `<option value="${d.department_id}">${d.name}</option>`).join('');
    const appOptions = applications.map(a => `<option value="${a.app_id}">${a.app_name} (${a.department_name})</option>`).join('');

    showModal('Add Activity', `
        <form id="activity-form">
            <div class="form-group">
                <label>Department *</label>
                <select name="department_id" required>${deptOptions}</select>
            </div>
            <div class="form-group">
                <label>Application (optional)</label>
                <select name="app_id">
                    <option value="">-- Select --</option>
                    ${appOptions}
                </select>
            </div>
            <div class="form-group">
                <label>Type *</label>
                <select name="type" required>
                    <option value="meeting">Meeting</option>
                    <option value="email">Email</option>
                    <option value="workshop">Workshop</option>
                    <option value="incident">Incident</option>
                </select>
            </div>
            <div class="form-group">
                <label>Date</label>
                <input type="date" name="date" value="${new Date().toISOString().split('T')[0]}">
            </div>
            <div class="form-group">
                <label>Summary *</label>
                <textarea name="summary" required></textarea>
            </div>
            <div class="form-group">
                <label>Next Action</label>
                <input type="text" name="next_action">
            </div>
            <div class="form-group">
                <label>Owner</label>
                <input type="text" name="owner">
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Save</button>
            </div>
        </form>
    `);

    document.getElementById('activity-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);
        if (!data.app_id) delete data.app_id;
        await apiCall('activities', 'POST', data);
        closeModal();
        await loadAllData();
        renderActivities();
    });
}

// ==================== INCIDENTS ====================
function renderIncidents() {
    const tbody = document.querySelector('#incidents-table tbody');
    tbody.innerHTML = incidents.map(i => `
        <tr>
            <td>#${i.incident_id}</td>
            <td><strong>${i.app_name || '-'}</strong><br><small>${i.department_name || ''}</small></td>
            <td><span class="badge badge-${i.severity}">${i.severity}</span></td>
            <td><span class="badge badge-${i.status}">${i.status}</span></td>
            <td>${i.description || '-'}</td>
            <td>${i.created_at ? new Date(i.created_at).toLocaleDateString() : '-'}</td>
            <td>${i.resolved_at ? new Date(i.resolved_at).toLocaleDateString() : '-'}</td>
            <td class="action-btns">
                <button class="btn btn-secondary btn-sm" onclick="editIncident(${i.incident_id})">Update</button>
            </td>
        </tr>
    `).join('');
}

function showAddIncidentModal() {
    const appOptions = applications.map(a => `<option value="${a.app_id}">${a.app_name} (${a.department_name})</option>`).join('');

    showModal('Add Incident', `
        <form id="incident-form">
            <div class="form-group">
                <label>Application *</label>
                <select name="app_id" required>${appOptions}</select>
            </div>
            <div class="form-group">
                <label>Severity *</label>
                <select name="severity" required>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                </select>
            </div>
            <div class="form-group">
                <label>Description *</label>
                <textarea name="description" required></textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Save</button>
            </div>
        </form>
    `);

    document.getElementById('incident-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);
        await apiCall('incidents', 'POST', data);
        closeModal();
        await loadAllData();
        renderIncidents();
        loadDashboard();
    });
}

async function editIncident(id) {
    const incident = incidents.find(i => i.incident_id === id);
    if (!incident) return;

    showModal('Update Incident', `
        <form id="incident-form">
            <p><strong>Incident #${incident.incident_id}</strong></p>
            <p><strong>Application:</strong> ${incident.app_name}</p>
            <hr style="margin: 1rem 0;">
            <div class="form-group">
                <label>Severity</label>
                <select name="severity">
                    <option value="low" ${incident.severity === 'low' ? 'selected' : ''}>Low</option>
                    <option value="medium" ${incident.severity === 'medium' ? 'selected' : ''}>Medium</option>
                    <option value="high" ${incident.severity === 'high' ? 'selected' : ''}>High</option>
                    <option value="critical" ${incident.severity === 'critical' ? 'selected' : ''}>Critical</option>
                </select>
            </div>
            <div class="form-group">
                <label>Status</label>
                <select name="status">
                    <option value="open" ${incident.status === 'open' ? 'selected' : ''}>Open</option>
                    <option value="investigating" ${incident.status === 'investigating' ? 'selected' : ''}>Investigating</option>
                    <option value="resolved" ${incident.status === 'resolved' ? 'selected' : ''}>Resolved</option>
                    <option value="closed" ${incident.status === 'closed' ? 'selected' : ''}>Closed</option>
                </select>
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea name="description">${incident.description || ''}</textarea>
            </div>
            <div class="form-group">
                <label>Root Cause</label>
                <textarea name="root_cause">${incident.root_cause || ''}</textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Save</button>
            </div>
        </form>
    `);

    document.getElementById('incident-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);
        await apiCall(`incidents/${id}`, 'PUT', data);
        closeModal();
        await loadAllData();
        renderIncidents();
        loadDashboard();
    });
}

// ==================== CHAT ====================
// Chat history for multi-turn conversations
let chatHistory = [];
let chartInstances = {};  // Store chart instances to destroy before creating new ones

function initChatButtons() {
    // Add clear and new chat button handlers
    const clearBtn = document.getElementById('chat-clear');
    const newChatBtn = document.getElementById('chat-new');

    if (clearBtn) {
        clearBtn.addEventListener('click', clearChatHistory);
    }
    if (newChatBtn) {
        newChatBtn.addEventListener('click', startNewChat);
    }
}

function clearChatHistory() {
    chatHistory = [];
    // Destroy all chart instances
    Object.values(chartInstances).forEach(chart => chart.destroy());
    chartInstances = {};

    const messagesContainer = document.getElementById('chat-messages');
    messagesContainer.innerHTML = `
        <div class="chat-message assistant">
            <p>Hello! I'm your AI assistant. Ask me questions about departments, applications, integrations, and more.</p>
            <p style="color: #666; font-size: 0.9em;">Try: "Which departments are critical?" or "Show me a chart of applications by status"</p>
        </div>
    `;
}

function startNewChat() {
    if (chatHistory.length > 0) {
        if (!confirm('Start a new conversation? Current chat history will be cleared.')) {
            return;
        }
    }
    clearChatHistory();
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (!message) return;

    const messagesContainer = document.getElementById('chat-messages');
    const sendBtn = document.getElementById('chat-send');

    // Add user message to UI
    messagesContainer.innerHTML += `
        <div class="chat-message user">
            <p>${escapeHtml(message)}</p>
        </div>
    `;

    // Add user message to history
    chatHistory.push({ role: 'user', content: message });

    // Clear input and disable
    input.value = '';
    sendBtn.disabled = true;
    input.disabled = true;

    // Add thinking indicator
    messagesContainer.innerHTML += `
        <div class="chat-message assistant" id="thinking">
            <p><span class="thinking-dots">Thinking</span></p>
        </div>
    `;
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    try {
        const response = await apiCall('chat', 'POST', {
            message,
            history: chatHistory.slice(0, -1)  // Send history without the current message
        });

        // Remove thinking indicator
        document.getElementById('thinking')?.remove();

        if (response.error) {
            messagesContainer.innerHTML += `
                <div class="chat-message assistant error">
                    <p>Error: ${escapeHtml(response.error)}</p>
                </div>
            `;
            // Remove failed message from history
            chatHistory.pop();
        } else {
            const formattedResponse = formatChatResponse(response.response, messagesContainer);

            // Add assistant message to history
            chatHistory.push({ role: 'assistant', content: response.response });
        }
    } catch (error) {
        document.getElementById('thinking')?.remove();
        messagesContainer.innerHTML += `
            <div class="chat-message assistant error">
                <p>Error: Failed to get response. Please try again.</p>
            </div>
        `;
        // Remove failed message from history
        chatHistory.pop();
    }

    // Re-enable input
    sendBtn.disabled = false;
    input.disabled = false;
    input.focus();
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function formatChatResponse(text, container) {
    // Check for chart blocks
    const chartRegex = /```chart\s*\n?([\s\S]*?)```/g;
    let lastIndex = 0;
    let hasChart = false;
    let match;

    // Create a message container div
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message assistant';

    while ((match = chartRegex.exec(text)) !== null) {
        hasChart = true;

        // Add text before chart
        const textBefore = text.substring(lastIndex, match.index);
        if (textBefore.trim()) {
            const textP = document.createElement('p');
            textP.innerHTML = formatMarkdownText(textBefore);
            messageDiv.appendChild(textP);
        }

        // Create chart container
        try {
            const chartData = JSON.parse(match[1]);
            const chartContainer = createChartElement(chartData);
            messageDiv.appendChild(chartContainer);
        } catch (e) {
            console.error('Failed to parse chart data:', e);
            const errorP = document.createElement('p');
            errorP.style.color = '#e74c3c';
            errorP.textContent = 'Failed to render chart';
            messageDiv.appendChild(errorP);
        }

        lastIndex = match.index + match[0].length;
    }

    // Add remaining text after last chart (or all text if no chart)
    const remainingText = text.substring(lastIndex);
    if (remainingText.trim()) {
        const textP = document.createElement('p');
        textP.innerHTML = formatMarkdownText(remainingText);
        messageDiv.appendChild(textP);
    }

    container.appendChild(messageDiv);

    // Initialize any charts
    messageDiv.querySelectorAll('.chart-canvas').forEach(canvas => {
        const chartDataStr = canvas.dataset.chart;
        if (chartDataStr) {
            try {
                const chartData = JSON.parse(chartDataStr);
                renderChart(canvas, chartData);
            } catch (e) {
                console.error('Failed to render chart:', e);
            }
        }
    });

    return messageDiv;
}

function formatMarkdownText(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^- (.*)/gm, '• $1')
        .replace(/^(\d+)\. (.*)/gm, '$1. $2')
        .replace(/\n/g, '<br>');
}

function createChartElement(chartData) {
    const container = document.createElement('div');
    container.className = 'chat-chart-container';

    if (chartData.title) {
        const title = document.createElement('h4');
        title.className = 'chart-title';
        title.textContent = chartData.title;
        container.appendChild(title);
    }

    const canvasId = 'chat-chart-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const canvas = document.createElement('canvas');
    canvas.id = canvasId;
    canvas.className = 'chart-canvas';
    canvas.dataset.chart = JSON.stringify(chartData);
    container.appendChild(canvas);

    return container;
}

function renderChart(canvas, chartData) {
    const ctx = canvas.getContext('2d');

    // Destroy existing chart if present
    if (chartInstances[canvas.id]) {
        chartInstances[canvas.id].destroy();
    }

    // Default colors if not provided
    const defaultColors = [
        '#26374A', '#E8112D', '#27AE60', '#3498DB', '#F39C12',
        '#9B59B6', '#1ABC9C', '#E74C3C', '#2C3E50', '#95A5A6'
    ];

    // Ensure datasets have colors
    if (chartData.datasets) {
        chartData.datasets.forEach((dataset, i) => {
            if (!dataset.backgroundColor) {
                if (['pie', 'doughnut'].includes(chartData.type)) {
                    dataset.backgroundColor = defaultColors.slice(0, dataset.data.length);
                } else {
                    dataset.backgroundColor = defaultColors[i % defaultColors.length];
                }
            }
            if (!dataset.borderColor && ['line'].includes(chartData.type)) {
                dataset.borderColor = dataset.backgroundColor;
                dataset.fill = false;
            }
        });
    }

    const config = {
        type: chartData.type || 'bar',
        data: {
            labels: chartData.labels,
            datasets: chartData.datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: ['pie', 'doughnut'].includes(chartData.type),
                    position: 'bottom'
                }
            },
            scales: ['pie', 'doughnut'].includes(chartData.type) ? {} : {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    };

    chartInstances[canvas.id] = new Chart(ctx, config);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== MODAL ====================
function showModal(title, content) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = content;
    document.getElementById('modal-overlay').classList.add('active');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
}

// Close modal on overlay click
document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') closeModal();
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});
