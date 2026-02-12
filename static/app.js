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

    // Dashboard card click handlers
    document.querySelector('.stat-departments')?.addEventListener('click', () => switchView('departments'));
    document.querySelector('.stat-applications')?.addEventListener('click', () => switchView('applications'));
    document.querySelector('.stat-risk')?.addEventListener('click', () => switchView('integrations'));
    document.querySelector('.stat-incidents')?.addEventListener('click', () => switchView('incidents'));

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
        await loadTagColors(); // Load tag colors for rendering
        populateDynamicFilters();
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// ==================== TAG COLOR MAPPING ====================
let tagColorMap = {}; // Cache for tag colors

async function loadTagColors() {
    try {
        const allTags = await apiCall('tags');
        tagColorMap = {};

        // Build a map of category_value -> color
        allTags.forEach(category => {
            if (category.tags) {
                category.tags.forEach(tag => {
                    const key = `${category.name}_${tag.value}`;
                    tagColorMap[key] = {
                        color: tag.color || '#3498DB',
                        label: tag.label || tag.value
                    };
                });
            }
        });
    } catch (error) {
        console.error('Error loading tag colors:', error);
    }
}

// Helper function to render a tag with its color
function renderTagBadge(categoryName, value) {
    if (!value) return '-';

    const key = `${categoryName}_${value}`;
    const tagInfo = tagColorMap[key];

    if (tagInfo) {
        return `<span class="tag-badge" style="background-color: ${tagInfo.color}; color: white; padding: 4px 10px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">${tagInfo.label}</span>`;
    }

    // Fallback to regular badge if tag not found
    return `<span class="badge badge-${value}">${value}</span>`;
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
    const tierFilter = document.getElementById('filter-dept-tier')?.value || '';
    const statusFilter = document.getElementById('filter-dept-status')?.value || '';
    const ownerFilter = document.getElementById('filter-dept-owner')?.value || '';
    const searchFilter = (document.getElementById('filter-dept-search')?.value || '').toLowerCase();

    let filtered = departments.filter(d => {
        if (tierFilter && d.tier !== tierFilter) return false;
        if (statusFilter && d.status !== statusFilter) return false;
        if (ownerFilter && d.owner_team !== ownerFilter) return false;
        if (searchFilter && !(d.name || '').toLowerCase().includes(searchFilter) && !(d.acronym || '').toLowerCase().includes(searchFilter)) return false;
        return true;
    });

    const tbody = document.querySelector('#departments-table tbody');
    tbody.innerHTML = filtered.map(d => `
        <tr>
            <td><strong>${d.name}</strong></td>
            <td>${d.acronym || '-'}</td>
            <td>${renderTagBadge('department_tier', d.tier)}</td>
            <td>${renderTagBadge('department_status', d.status)}</td>
            <td>${renderTagBadge('department_owner_team', d.owner_team)}</td>
            <td>${d.app_count || 0}</td>
            <td class="action-btns">
                <button class="btn btn-secondary btn-sm" onclick="editDepartment(${d.department_id})">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteDepartment(${d.department_id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

// Helper function to build dropdown options from tags
// selectedValue can be a string (single value) or an array of strings (multiple values)
async function buildTagOptions(categoryName, selectedValue = '') {
    try {
        const response = await apiCall(`tags/${categoryName}`);
        const tags = response.tags || [];

        // Normalize selectedValue to an array
        const selectedValues = Array.isArray(selectedValue) ? selectedValue : [selectedValue];

        return tags
            .filter(tag => tag.is_active)
            .sort((a, b) => a.sort_order - b.sort_order)
            .map(tag => `<option value="${tag.value}" ${selectedValues.includes(tag.value) ? 'selected' : ''}>${tag.label}</option>`)
            .join('');
    } catch (error) {
        console.error(`Error loading tags for ${categoryName}:`, error);
        return '';
    }
}

async function showAddDepartmentModal() {
    // Load tag options
    const tierOptions = await buildTagOptions('department_tier', 'standard');
    const statusOptions = await buildTagOptions('department_status', 'active');
    const ownerOptions = await buildTagOptions('department_owner_team');

    showModal('Add Department', `
        <form id="department-form">
            <div class="form-group">
                <label>Name *</label>
                <input type="text" name="name" required>
            </div>
            <div class="form-group">
                <label>Acronym</label>
                <input type="text" name="acronym">
            </div>
            <div class="form-group">
                <label>Tier</label>
                <select name="tier">
                    ${tierOptions}
                </select>
            </div>
            <div class="form-group">
                <label>Status</label>
                <select name="status">
                    ${statusOptions}
                </select>
            </div>
            <div class="form-group">
                <label>Owner Team</label>
                <select name="owner_team">
                    <option value="">-- Select Team --</option>
                    ${ownerOptions}
                </select>
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

    // Load tag options with current values selected
    const tierOptions = await buildTagOptions('department_tier', dept.tier);
    const statusOptions = await buildTagOptions('department_status', dept.status);
    const ownerOptions = await buildTagOptions('department_owner_team', dept.owner_team);

    showModal('Edit Department', `
        <form id="department-form">
            <div class="form-group">
                <label>Name *</label>
                <input type="text" name="name" value="${dept.name}" required>
            </div>
            <div class="form-group">
                <label>Acronym</label>
                <input type="text" name="acronym" value="${dept.acronym || ''}">
            </div>
            <div class="form-group">
                <label>Tier</label>
                <select name="tier">
                    ${tierOptions}
                </select>
            </div>
            <div class="form-group">
                <label>Status</label>
                <select name="status">
                    ${statusOptions}
                </select>
            </div>
            <div class="form-group">
                <label>Owner Team</label>
                <select name="owner_team">
                    <option value="">-- Select Team --</option>
                    ${ownerOptions}
                </select>
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
    const deptFilter = document.getElementById('filter-app-dept')?.value || '';
    const envFilter = document.getElementById('filter-app-env')?.value || '';
    const authFilter = document.getElementById('filter-app-auth')?.value || '';
    const statusFilter = document.getElementById('filter-app-status')?.value || '';
    const searchFilter = (document.getElementById('filter-app-search')?.value || '').toLowerCase();

    let filtered = applications.filter(a => {
        if (deptFilter && String(a.department_id) !== deptFilter) return false;
        if (envFilter && a.environment !== envFilter) return false;
        // Filter logical check for multiple auth types: checks if the filter value is IN the application's auth types
        if (authFilter && !(a.auth_type || '').includes(authFilter)) return false;
        if (statusFilter && a.status !== statusFilter) return false;
        if (searchFilter && !(a.app_name || '').toLowerCase().includes(searchFilter)) return false;
        return true;
    });

    const tbody = document.querySelector('#applications-table tbody');
    tbody.innerHTML = filtered.map(a => {
        // Render multiple auth types
        const authTypes = (a.auth_type || '').split(',').map(t => t.trim()).filter(t => t);
        const authBadges = authTypes.map(type => renderTagBadge('application_auth_type', type)).join(' ');

        return `
        <tr>
            <td><strong>${a.app_name}</strong></td>
            <td>${a.department_name || '-'}</td>
            <td>${renderTagBadge('application_environment', a.environment)}</td>
            <td>${authBadges || '-'}</td>
            <td>${renderTagBadge('application_status', a.status)}</td>
            <td>${a.go_live_date || '-'}</td>
            <td class="action-btns">
                <button class="btn btn-secondary btn-sm" onclick="editApplication(${a.app_id})">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteApplication(${a.app_id})">Delete</button>
            </td>
        </tr>
    `}).join('');
}

async function showAddApplicationModal() {
    const deptOptions = departments.map(d => `<option value="${d.department_id}">${d.name}</option>`).join('');

    // Load tag options
    const envOptions = await buildTagOptions('application_environment', 'prod');
    const authOptions = await buildTagOptions('application_auth_type', 'GC Key');
    const statusOptions = await buildTagOptions('application_status', 'integrating');

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
                    ${envOptions}
                </select>
            </div>
            <div class="form-group">
                <label>Auth Type (Hold Ctrl to select multiple)</label>
                <select name="auth_type" multiple style="height: 100px;">
                    ${authOptions}
                </select>
            </div>
            <div class="form-group">
                <label>Status</label>
                <select name="status">
                    ${statusOptions}
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

        // Handle multi-select for auth_type manually
        const authTypes = [];
        const authSelect = e.target.querySelector('select[name="auth_type"]');
        if (authSelect) {
            for (let option of authSelect.options) {
                if (option.selected) {
                    authTypes.push(option.value);
                }
            }
        }

        const data = Object.fromEntries(formData);
        // data.auth_type will only contain the last selected value from FormData if straight conversion is used,
        // so we overwrite it with our array (or backend expects array)
        if (authTypes.length > 0) {
            data['auth_type'] = authTypes;
        }

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

    // Load tag options with current values selected
    const envOptions = await buildTagOptions('application_environment', app.environment);

    // Handle multiple auth types for edit
    const currentAuthTypes = (app.auth_type || '').split(',');
    const authOptions = await buildTagOptions('application_auth_type', currentAuthTypes);

    const statusOptions = await buildTagOptions('application_status', app.status);

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
                    ${envOptions}
                </select>
            </div>
            <div class="form-group">
                <label>Auth Type (Hold Ctrl to select multiple)</label>
                <select name="auth_type" multiple style="height: 100px;">
                    ${authOptions}
                </select>
            </div>
            <div class="form-group">
                <label>Status</label>
                <select name="status">
                    ${statusOptions}
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

        // Handle multi-select for auth_type manually
        const authTypes = [];
        const authSelect = e.target.querySelector('select[name="auth_type"]');
        if (authSelect) {
            for (let option of authSelect.options) {
                if (option.selected) {
                    authTypes.push(option.value);
                }
            }
        }

        if (authTypes.length > 0) {
            data['auth_type'] = authTypes;
        }

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
    const deptFilter = document.getElementById('filter-int-dept')?.value || '';
    const stageFilter = document.getElementById('filter-int-stage')?.value || '';
    const statusFilter = document.getElementById('filter-int-status')?.value || '';
    const riskFilter = document.getElementById('filter-int-risk')?.value || '';

    let filtered = integrations.filter(i => {
        if (deptFilter && String(i.department_id) !== deptFilter) return false;
        if (stageFilter && i.stage !== stageFilter) return false;
        if (statusFilter && i.status !== statusFilter) return false;
        if (riskFilter && i.risk_level !== riskFilter) return false;
        return true;
    });

    const tbody = document.querySelector('#integrations-table tbody');
    tbody.innerHTML = filtered.map(i => `
        <tr>
            <td><strong>${i.app_name || '-'}</strong></td>
            <td>${i.department_name || '-'}</td>
            <td>${renderTagBadge('integration_stage', i.stage)}</td>
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

    // Load tag options with current value selected
    const stageOptions = await buildTagOptions('integration_stage', integ.stage);

    showModal('Update Integration Status', `
        <form id="integration-form">
            <p><strong>Application:</strong> ${integ.app_name}</p>
            <p><strong>Department:</strong> ${integ.department_name}</p>
            <hr style="margin: 1rem 0;">
            <div class="form-group">
                <label>Stage</label>
                <select name="stage">
                    ${stageOptions}
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
    const deptFilter = document.getElementById('filter-con-dept')?.value || '';
    const roleFilter = document.getElementById('filter-con-role')?.value || '';
    const activeFilter = document.getElementById('filter-con-active')?.value || '';
    const searchFilter = (document.getElementById('filter-con-search')?.value || '').toLowerCase();

    let filtered = contacts.filter(c => {
        if (deptFilter && String(c.department_id) !== deptFilter) return false;
        if (roleFilter && c.role !== roleFilter) return false;
        if (activeFilter !== '' && String(c.active_flag ? 1 : 0) !== activeFilter) return false;
        if (searchFilter && !(c.name || '').toLowerCase().includes(searchFilter) && !(c.email || '').toLowerCase().includes(searchFilter)) return false;
        return true;
    });

    const tbody = document.querySelector('#contacts-table tbody');
    tbody.innerHTML = filtered.map(c => `
        <tr>
            <td><strong>${c.name}</strong></td>
            <td>${c.department_name || '-'}</td>
            <td>${renderTagBadge('contact_role', c.role)}</td>
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

async function showAddContactModal() {
    const deptOptions = departments.map(d => `<option value="${d.department_id}">${d.name}</option>`).join('');

    // Load tag options
    const roleOptions = await buildTagOptions('contact_role');

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
                    <option value="">-- Select Role --</option>
                    ${roleOptions}
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

    // Load tag options with current value selected
    const roleOptions = await buildTagOptions('contact_role', contact.role);

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
                    <option value="">-- Select Role --</option>
                    ${roleOptions}
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
    const deptFilter = document.getElementById('filter-act-dept')?.value || '';
    const typeFilter = document.getElementById('filter-act-type')?.value || '';
    const ownerFilter = document.getElementById('filter-act-owner')?.value || '';
    const dateFrom = document.getElementById('filter-act-date-from')?.value || '';
    const dateTo = document.getElementById('filter-act-date-to')?.value || '';

    let filtered = activities.filter(a => {
        if (deptFilter && String(a.department_id) !== deptFilter) return false;
        if (typeFilter && a.type !== typeFilter) return false;
        if (ownerFilter && a.owner !== ownerFilter) return false;
        if (dateFrom && a.date && a.date < dateFrom) return false;
        if (dateTo && a.date && a.date > dateTo) return false;
        return true;
    });

    const tbody = document.querySelector('#activities-table tbody');
    tbody.innerHTML = filtered.map(a => `
        <tr>
            <td>${a.date || '-'}</td>
            <td>${renderTagBadge('activity_type', a.type)}</td>
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

    // Load tag options with current value selected
    const typeOptions = await buildTagOptions('activity_type', activity.type);

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
                    ${typeOptions}
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

async function showAddActivityModal() {
    const deptOptions = departments.map(d => `<option value="${d.department_id}">${d.name}</option>`).join('');
    const appOptions = applications.map(a => `<option value="${a.app_id}">${a.app_name} (${a.department_name})</option>`).join('');

    // Load tag options
    const typeOptions = await buildTagOptions('activity_type', 'meeting');

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
                    ${typeOptions}
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
    const severityFilter = document.getElementById('filter-inc-severity')?.value || '';
    const statusFilter = document.getElementById('filter-inc-status')?.value || '';
    const appFilter = document.getElementById('filter-inc-app')?.value || '';
    const dateFrom = document.getElementById('filter-inc-date-from')?.value || '';
    const dateTo = document.getElementById('filter-inc-date-to')?.value || '';

    let filtered = incidents.filter(i => {
        if (severityFilter && i.severity !== severityFilter) return false;
        if (statusFilter && i.status !== statusFilter) return false;
        if (appFilter && String(i.app_id) !== appFilter) return false;
        if (dateFrom && i.created_at && i.created_at.split('T')[0] < dateFrom) return false;
        if (dateTo && i.created_at && i.created_at.split('T')[0] > dateTo) return false;
        return true;
    });

    const tbody = document.querySelector('#incidents-table tbody');
    tbody.innerHTML = filtered.map(i => `
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

// ==================== FILTERS ====================
function populateDynamicFilters() {
    // Helper to populate a select with options preserving current selection
    function populateSelect(selectId, items, valueFn, labelFn) {
        const select = document.getElementById(selectId);
        if (!select) return;
        const currentValue = select.value;
        const firstOption = select.options[0]; // "All ..." option
        select.innerHTML = '';
        select.appendChild(firstOption);
        const seen = new Set();
        items.forEach(item => {
            const val = valueFn(item);
            const label = labelFn(item);
            if (val && !seen.has(val)) {
                seen.add(val);
                const opt = document.createElement('option');
                opt.value = val;
                opt.textContent = label;
                select.appendChild(opt);
            }
        });
        select.value = currentValue; // Restore selection
    }

    // Departments tab: Owner Team (dynamic from data)
    populateSelect('filter-dept-owner', departments, d => d.owner_team, d => d.owner_team);

    // Applications tab: Department dropdown
    populateSelect('filter-app-dept', departments, d => String(d.department_id), d => d.name);

    // Integrations tab: Department dropdown
    populateSelect('filter-int-dept', departments, d => String(d.department_id), d => d.name);

    // Contacts tab: Department dropdown
    populateSelect('filter-con-dept', departments, d => String(d.department_id), d => d.name);

    // Activities tab: Department + Owner (dynamic)
    populateSelect('filter-act-dept', departments, d => String(d.department_id), d => d.name);
    populateSelect('filter-act-owner', activities, a => a.owner, a => a.owner);

    // Incidents tab: Application dropdown
    populateSelect('filter-inc-app', applications, a => String(a.app_id), a => a.app_name);
}

function resetFilters(tab) {
    const filterIds = {
        departments: ['filter-dept-tier', 'filter-dept-status', 'filter-dept-owner', 'filter-dept-search'],
        applications: ['filter-app-dept', 'filter-app-env', 'filter-app-auth', 'filter-app-status', 'filter-app-search'],
        integrations: ['filter-int-dept', 'filter-int-stage', 'filter-int-status', 'filter-int-risk'],
        contacts: ['filter-con-dept', 'filter-con-role', 'filter-con-active', 'filter-con-search'],
        activities: ['filter-act-dept', 'filter-act-type', 'filter-act-owner', 'filter-act-date-from', 'filter-act-date-to'],
        incidents: ['filter-inc-severity', 'filter-inc-status', 'filter-inc-app', 'filter-inc-date-from', 'filter-inc-date-to']
    };

    (filterIds[tab] || []).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    // Re-render the tab
    const renderFns = {
        departments: renderDepartments,
        applications: renderApplications,
        integrations: renderIntegrations,
        contacts: renderContacts,
        activities: renderActivities,
        incidents: renderIncidents
    };
    if (renderFns[tab]) renderFns[tab]();
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

// ==================== TAG MANAGEMENT ====================
let tagCategories = [];
let currentCategory = null;
let currentCategoryTags = [];

// Load all tag categories on page load
async function loadTagCategories() {
    try {
        tagCategories = await apiCall('tags');
        populateTagCategorySelector();
    } catch (error) {
        console.error('Error loading tag categories:', error);
    }
}

function populateTagCategorySelector() {
    const select = document.getElementById('tag-category-select');
    if (!select) return;

    // Map entity types to user-friendly tab names
    const entityTypeToTab = {
        'department': 'Department',
        'application': 'Application',
        'integration': 'Integration',
        'contact': 'Contact',
        'activity': 'Activity'
    };

    // Create an array of objects with category data and formatted labels
    const categoryOptions = tagCategories.map(cat => {
        const tabName = entityTypeToTab[cat.entity_type] || cat.entity_type;
        // Extract field name from display_name (e.g., "Department Tier" -> "Tier")
        const fieldName = cat.display_name.replace(new RegExp(`^${tabName}\\s+`, 'i'), '');
        const formattedLabel = `${tabName} - ${fieldName}`;

        return {
            name: cat.name,
            label: formattedLabel
        };
    });

    // Sort by the formatted label
    categoryOptions.sort((a, b) => a.label.localeCompare(b.label));

    // Generate the HTML options
    const options = categoryOptions.map(opt => {
        return `<option value="${opt.name}">${opt.label}</option>`;
    }).join('');

    select.innerHTML = '<option value="">-- Select a category --</option>' + options;
}

async function loadTagsForCategory() {
    const select = document.getElementById('tag-category-select');
    const categoryName = select?.value;

    if (!categoryName) {
        document.getElementById('tag-category-info').style.display = 'none';
        document.getElementById('tags-table-container').style.display = 'none';
        document.getElementById('no-category-selected').style.display = 'block';
        return;
    }

    try {
        const response = await apiCall(`tags/${categoryName}`);
        currentCategory = response.category;
        currentCategoryTags = response.tags;

        // Update UI
        document.getElementById('tag-category-title').textContent = currentCategory.display_name;
        document.getElementById('tag-category-description').textContent = currentCategory.description;
        document.getElementById('tag-category-info').style.display = 'block';
        document.getElementById('tags-table-container').style.display = 'block';
        document.getElementById('no-category-selected').style.display = 'none';

        renderTagsTable();
    } catch (error) {
        console.error('Error loading tags for category:', error);
    }
}

function renderTagsTable() {
    const tbody = document.querySelector('#tags-table tbody');
    if (!tbody) return;

    tbody.innerHTML = currentCategoryTags.map(tag => `
        <tr>
            <td><strong>${tag.label}</strong></td>
            <td><code>${tag.value}</code></td>
            <td>
                <span class="tag-color-badge" style="background-color: ${tag.color}; color: white; padding: 4px 12px; border-radius: 4px;">
                    ${tag.color}
                </span>
            </td>
            <td>
                <span class="badge badge-${tag.is_active ? 'active' : 'inactive'}">
                    ${tag.is_active ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td>${tag.sort_order}</td>
            <td class="action-btns">
                <button class="btn btn-secondary btn-sm" onclick="editTag(${tag.tag_id})">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteTag(${tag.tag_id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

function showAddTagModal() {
    if (!currentCategory) return;

    showModal('Add Tag', `
        <form id="tag-form">
            <p><strong>Category:</strong> ${currentCategory.display_name}</p>
            <hr style="margin: 1rem 0;">
            <div class="form-group">
                <label>Label (Display Name) *</label>
                <input type="text" name="label" required placeholder="e.g., High Priority">
            </div>
            <div class="form-group">
                <label>Value (Internal) *</label>
                <input type="text" name="value" required placeholder="e.g., high_priority">
                <small>Used in database. Use lowercase with underscores.</small>
            </div>
            <div class="form-group">
                <label>Color</label>
                <input type="color" name="color" value="#3498DB">
            </div>
            <div class="form-group">
                <label>Sort Order</label>
                <input type="number" name="sort_order" value="${currentCategoryTags.length + 1}">
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Save</button>
            </div>
        </form>
    `);

    document.getElementById('tag-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);

        try {
            await apiCall(`tags/${currentCategory.name}`, 'POST', data);
            closeModal();
            await loadTagsForCategory();
            alert('Tag created successfully!');
        } catch (error) {
            alert('Error creating tag: ' + (error.message || 'Unknown error'));
        }
    });
}

async function editTag(tagId) {
    const tag = currentCategoryTags.find(t => t.tag_id === tagId);
    if (!tag) return;

    showModal('Edit Tag', `
        <form id="tag-form">
            <p><strong>Category:</strong> ${currentCategory.display_name}</p>
            <hr style="margin: 1rem 0;">
            <div class="form-group">
                <label>Label (Display Name) *</label>
                <input type="text" name="label" value="${tag.label}" required>
            </div>
            <div class="form-group">
                <label>Value (Internal) *</label>
                <input type="text" name="value" value="${tag.value}" required>
                <small>⚠️ Changing this may affect existing records</small>
            </div>
            <div class="form-group">
                <label>Color</label>
                <input type="color" name="color" value="${tag.color || '#3498DB'}">
            </div>
            <div class="form-group">
                <label>Sort Order</label>
                <input type="number" name="sort_order" value="${tag.sort_order}">
            </div>
            <div class="form-group">
                <label>
                    <input type="checkbox" name="is_active" ${tag.is_active ? 'checked' : ''}>
                    Active
                </label>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Save</button>
            </div>
        </form>
    `);

    document.getElementById('tag-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);
        data.is_active = formData.has('is_active');

        try {
            await apiCall(`tags/${tagId}`, 'PUT', data);
            closeModal();
            await loadTagsForCategory();
            alert('Tag updated successfully!');
        } catch (error) {
            alert('Error updating tag: ' + (error.message || 'Unknown error'));
        }
    });
}

async function deleteTag(tagId) {
    if (!confirm('Are you sure you want to delete this tag? This action cannot be undone if the tag is not in use.')) return;

    try {
        const response = await fetch(`/api/tags/${tagId}`, { method: 'DELETE' });
        const result = await response.json();

        if (!response.ok) {
            alert(result.error + (result.suggestion ? '\n\n' + result.suggestion : ''));
            return;
        }

        await loadTagsForCategory();
        alert('Tag deleted successfully!');
    } catch (error) {
        alert('Error deleting tag: ' + (error.message || 'Unknown error'));
    }
}

// Load tag categories when switching to tags view
document.addEventListener('DOMContentLoaded', () => {
    const originalSwitchView = window.switchView;
    window.switchView = function (viewName) {
        originalSwitchView(viewName);
        if (viewName === 'tags') {
            loadTagCategories();
        }
    };
});
