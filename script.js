document.addEventListener('DOMContentLoaded', () => {
    // State Management
    let clients = [];
    let currentClientId = null; // Currently viewed client in details modal
    let deleteTarget = null; // { type: 'client'|'checklist', id, clientId }
    let authenticatedUserId = null;
    let currentUserRole = null;
    let authLoadVersion = 0;
    let appListenersInitialized = false;

    // DOM Elements - Authentication
    const loginScreen = document.getElementById('loginScreen');
    const loginForm = document.getElementById('loginForm');
    const loginEmail = document.getElementById('loginEmail');
    const loginPassword = document.getElementById('loginPassword');
    const loginError = document.getElementById('loginError');
    const loginSubmitBtn = document.getElementById('loginSubmitBtn');
    const openViewerSignupBtn = document.getElementById('openViewerSignupBtn');
    const viewerSignupModal = document.getElementById('viewerSignupModal');
    const viewerSignupForm = document.getElementById('viewerSignupForm');
    const signupEmailInput = document.getElementById('signupEmailInput');
    const signupPasswordInput = document.getElementById('signupPasswordInput');
    const signupPasswordConfirmInput = document.getElementById('signupPasswordConfirmInput');
    const viewerSignupMessage = document.getElementById('viewerSignupMessage');
    const viewerSignupSubmitBtn = document.getElementById('viewerSignupSubmitBtn');
    const closeViewerSignupBtn = document.getElementById('closeViewerSignupBtn');
    const cancelViewerSignupBtn = document.getElementById('cancelViewerSignupBtn');
    const appContainer = document.getElementById('appContainer');
    const signOutBtn = document.getElementById('signOutBtn');
    const accessRoleBadge = document.getElementById('accessRoleBadge');

    // DOM Elements - Main View
    const clientsTableBody = document.getElementById('clientsTableBody');
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const openAddClientModalBtn = document.getElementById('openAddClientModalBtn');
    
    // Metrics
    const totalClientsCount = document.getElementById('totalClientsCount');
    const completedClientsCount = document.getElementById('completedClientsCount');
    const ongoingClientsCount = document.getElementById('ongoingClientsCount');
    const redClientsCount = document.getElementById('redClientsCount');

    // DOM Elements - Client Modal
    const clientModal = document.getElementById('clientModal');
    const clientModalTitle = document.getElementById('clientModalTitle');
    const clientForm = document.getElementById('clientForm');
    const clientIdField = document.getElementById('clientIdField');
    const clientNameInput = document.getElementById('clientNameInput');
    const eventTypeInput = document.getElementById('eventTypeInput');
    const eventDateInput = document.getElementById('eventDateInput');
    const venueInput = document.getElementById('venueInput');
    const closeClientModalBtn = document.getElementById('closeClientModalBtn');
    const cancelClientBtn = document.getElementById('cancelClientBtn');

    // DOM Elements - Details Modal
    const detailsModal = document.getElementById('detailsModal');
    const closeDetailsModalBtn = document.getElementById('closeDetailsModalBtn');
    const detailsClientName = document.getElementById('detailsClientName');
    const detailsEventMeta = document.getElementById('detailsEventMeta');
    const detailsOverallBadge = document.getElementById('detailsOverallBadge');
    const openAddChecklistBtn = document.getElementById('openAddChecklistBtn');
    const checklistTableBody = document.getElementById('checklistTableBody');

    // DOM Elements - Checklist Item Modal
    const checklistModal = document.getElementById('checklistModal');
    const checklistModalTitle = document.getElementById('checklistModalTitle');
    const checklistForm = document.getElementById('checklistForm');
    const checklistItemIdField = document.getElementById('checklistItemIdField');
    const checklistCategoryInput = document.getElementById('checklistCategoryInput');
    const checklistItemNameInput = document.getElementById('checklistItemNameInput');
    const checklistNotesInput = document.getElementById('checklistNotesInput');
    const checklistDueDateInput = document.getElementById('checklistDueDateInput');
    const closeChecklistModalBtn = document.getElementById('closeChecklistModalBtn');
    const cancelChecklistBtn = document.getElementById('cancelChecklistBtn');

    // DOM Elements - Confirm Dialog
    const confirmModal = document.getElementById('confirmModal');
    const confirmTitle = document.getElementById('confirmTitle');
    const confirmMessage = document.getElementById('confirmMessage');
    const confirmYesBtn = document.getElementById('confirmYesBtn');
    const confirmNoBtn = document.getElementById('confirmNoBtn');

    // Backup / Restore Elements
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const importFile = document.getElementById('importFile');
    const migrateLocalDataBtn = document.getElementById('migrateLocalDataBtn');
    const createViewerModal = document.getElementById('createViewerModal');
    const createViewerForm = document.getElementById('createViewerForm');
    const viewerEmailInput = document.getElementById('viewerEmailInput');
    const createViewerError = document.getElementById('createViewerError');
    const createViewerSubmitBtn = document.getElementById('createViewerSubmitBtn');
    const closeCreateViewerBtn = document.getElementById('closeCreateViewerBtn');
    const cancelCreateViewerBtn = document.getElementById('cancelCreateViewerBtn');
    const toastContainer = document.getElementById('toastContainer');

    // Authentication starts first; the app is initialized only for an authenticated session.
    setupAuthentication();

    function setupAuthentication() {
        loginForm.addEventListener('submit', handleSignIn);
        openViewerSignupBtn.addEventListener('click', openViewerSignup);
        closeViewerSignupBtn.addEventListener('click', closeViewerSignup);
        cancelViewerSignupBtn.addEventListener('click', closeViewerSignup);
        viewerSignupForm.addEventListener('submit', handleViewerSignup);
        signOutBtn.addEventListener('click', handleSignOut);

        supabaseClient.auth.onAuthStateChange((event, session) => {
            if (event === 'INITIAL_SESSION' ||
                event === 'SIGNED_IN' ||
                event === 'SIGNED_OUT' ||
                event === 'TOKEN_REFRESHED' ||
                event === 'USER_UPDATED' ||
                event === 'PASSWORD_RECOVERY') {
                window.setTimeout(() => {
                    handleAuthState(session).catch(error => {
                        console.error('Failed to initialize authenticated session:', error);
                        showLoginError('Could not initialize your session. Please sign in again.');
                    });
                }, 0);
            }
        });

        supabaseClient.auth.getSession()
            .then(({ data, error }) => {
                if (error) throw error;
                return handleAuthState(data.session);
            })
            .catch(error => {
                console.error('Failed to check authentication session:', error);
                showLoginError('Could not check your sign-in session. Please refresh and try again.');
            });
    }

    async function handleSignIn(event) {
        event.preventDefault();
        loginError.hidden = true;
        loginSubmitBtn.disabled = true;
        loginSubmitBtn.textContent = 'Signing In...';

        try {
            const { error } = await supabaseClient.auth.signInWithPassword({
                email: loginEmail.value.trim(),
                password: loginPassword.value
            });
            if (error) throw error;
        } catch (error) {
            console.error('Sign-in failed:', error);
            showLoginError(error.message || 'Sign-in failed. Check your email and password.');
        } finally {
            loginSubmitBtn.disabled = false;
            loginSubmitBtn.textContent = 'Sign In';
        }
    }

    function openViewerSignup() {
        viewerSignupForm.reset();
        viewerSignupMessage.className = 'auth-error';
        viewerSignupMessage.hidden = true;
        viewerSignupModal.style.display = 'flex';
        signupEmailInput.focus();
    }

    function closeViewerSignup() {
        viewerSignupModal.style.display = 'none';
        viewerSignupForm.reset();
        viewerSignupMessage.className = 'auth-error';
        viewerSignupMessage.hidden = true;
    }

    async function handleViewerSignup(event) {
        event.preventDefault();
        viewerSignupMessage.hidden = true;

        const email = signupEmailInput.value.trim();
        const password = signupPasswordInput.value;
        if (password !== signupPasswordConfirmInput.value) {
            viewerSignupMessage.className = 'auth-error';
            viewerSignupMessage.textContent = 'The passwords do not match.';
            viewerSignupMessage.hidden = false;
            return;
        }

        viewerSignupSubmitBtn.disabled = true;
        viewerSignupSubmitBtn.textContent = 'Creating Account...';
        try {
            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password,
                options: { emailRedirectTo: window.location.href.split(/[?#]/)[0] }
            });
            if (error) throw error;
            if (!data.user) {
                throw new Error('Supabase did not return an account. Please try again.');
            }

            viewerSignupForm.reset();
            if (data.session) {
                closeViewerSignup();
                showToast('Viewer account created. You are now signed in.', 'success');
            } else {
                viewerSignupMessage.className = 'auth-success';
                viewerSignupMessage.textContent = 'Account created. Check your email to confirm it, then sign in.';
                viewerSignupMessage.hidden = false;
            }
        } catch (error) {
            console.error('Viewer signup failed:', error);
            viewerSignupMessage.className = 'auth-error';
            viewerSignupMessage.textContent = error.message || 'Could not create the account. Please try again.';
            viewerSignupMessage.hidden = false;
        } finally {
            viewerSignupSubmitBtn.disabled = false;
            viewerSignupSubmitBtn.textContent = 'Create Account';
        }
    }

    async function handleSignOut() {
        try {
            const { error } = await supabaseClient.auth.signOut();
            if (error) throw error;
        } catch (error) {
            console.error('Sign-out failed:', error);
            showToast('Could not sign out. Please try again.', 'error');
        }
    }

    async function handleAuthState(session) {
        if (!session) {
            authLoadVersion += 1;
            authenticatedUserId = null;
            currentUserRole = null;
            clients = [];
            currentClientId = null;
            clientModal.style.display = 'none';
            detailsModal.style.display = 'none';
            checklistModal.style.display = 'none';
            confirmModal.style.display = 'none';
            createViewerModal.style.display = 'none';
            viewerSignupModal.style.display = 'none';
            appContainer.hidden = true;
            loginScreen.hidden = false;
            updateRoleControls();
            return;
        }

        if (authenticatedUserId === session.user.id && currentUserRole) return;

        authenticatedUserId = session.user.id;
        const loadVersion = ++authLoadVersion;
        loginScreen.hidden = false;
        appContainer.hidden = true;
        loginError.hidden = true;

        try {
            const { data: staffAccess, error: staffAccessError } = await supabaseClient
                .from('staff_access')
                .select('role, is_active')
                .eq('user_id', session.user.id)
                .maybeSingle();

            if (staffAccessError) throw staffAccessError;
            if (!staffAccess || staffAccess.is_active !== true) {
                throw new Error('This account does not have active staff access. Contact your administrator.');
            }
            if (loadVersion !== authLoadVersion) return;

            currentUserRole = String(staffAccess.role || '').toLowerCase();
            updateRoleControls();
            loginScreen.hidden = true;
            appContainer.hidden = false;

            if (!appListenersInitialized) {
                setupEventListeners();
                appListenersInitialized = true;
            }

            clients = [];
            renderDashboard();
            renderClientsTable();
            await loadClientsFromSupabase(loadVersion);
        } catch (error) {
            if (loadVersion !== authLoadVersion) return;
            console.error('Could not verify staff access or load the application:', error);
            authenticatedUserId = null;
            currentUserRole = null;
            clients = [];
            appContainer.hidden = true;
            loginScreen.hidden = false;
            updateRoleControls();
            showLoginError(error.message || 'Could not verify staff access. Check your account and database policies.');
            try {
                const { error: signOutError } = await supabaseClient.auth.signOut({ scope: 'local' });
                if (signOutError) throw signOutError;
            } catch (signOutError) {
                console.error('Could not clear unauthorized session:', signOutError);
            }
        }
    }

    function isAdmin() {
        return currentUserRole === 'admin';
    }

    function requireAdmin() {
        if (isAdmin()) return true;
        showToast('This action is available to administrators only.', 'error');
        return false;
    }

    function updateRoleControls() {
        const admin = isAdmin();
        accessRoleBadge.textContent = currentUserRole
            ? (admin ? 'Access: Administrator' : 'Access: View only')
            : '';
        openAddClientModalBtn.hidden = !admin;
        openAddChecklistBtn.hidden = !admin;
        importBtn.hidden = !admin;
        migrateLocalDataBtn.hidden = !admin;
    }

    function showLoginError(message) {
        loginError.textContent = message;
        loginError.hidden = false;
    }

    function initApp() {
        verifyAndMigrateData();
        renderDashboard();
        renderClientsTable();
    }

    async function loadClientsFromSupabase(loadVersion) {
        const { data: clientRows, error: clientsError } =
            await supabaseClient
                .from('clients')
                .select('*')
                .is('deleted_at', null)
                .order('created_at', { ascending: false });

        if (clientsError) throw clientsError;

        const { data: checklistRows, error: checklistError } =
            await supabaseClient
                .from('checklist_items')
                .select('*')
                .order('created_at', { ascending: true });

        if (checklistError) throw checklistError;

        if (loadVersion !== authLoadVersion) return;

        clients = clientRows.map(row => ({
            id: row.local_storage_id || row.client_code || `CL-${row.id}`,
            dbId: row.id,
            name: row.client_name || '',
            eventType: row.event_type || '',
            eventDate: row.event_date || '',
            venue: row.venue || '',
            status: (row.status || 'red').toUpperCase(),
            dateAdded: row.created_at
                ? formatReadableDateTime(new Date(row.created_at))
                : '',
            checklist: checklistRows
                .filter(item => item.client_id === row.id)
                .map(item => ({
                    id: item.local_storage_id || String(item.id),
                    dbId: item.id,
                    category: item.category || '',
                    name: item.task_name || '',
                    notes: item.notes || '',
                    dueDate: item.due_date || '',
                    status: (item.status || 'red').toUpperCase(),
                    dateAdded: item.created_at
                        ? formatReadableDateTime(new Date(item.created_at))
                        : '',
                    lastUpdated: item.updated_at
                        ? formatReadableDateTime(new Date(item.updated_at))
                        : ''
                }))
        }));

        verifyAndMigrateData();
        renderDashboard();
        renderClientsTable();
    }

    // Migration rule: ensure every client and checklist item has a valid status, defaulting to RED if missing.
    function verifyAndMigrateData() {
        let updated = false;
        clients.forEach(client => {
            const clientStatus = String(client.status || '').toUpperCase();
            if (['RED', 'ORANGE', 'GREEN'].includes(clientStatus)) {
                if (client.status !== clientStatus) updated = true;
                client.status = clientStatus;
            } else {
                client.status = 'RED';
                updated = true;
            }
            if (!client.checklist) client.checklist = [];
            client.checklist.forEach(item => {
                const itemStatus = String(item.status || '').toUpperCase();
                if (['RED', 'ORANGE', 'GREEN'].includes(itemStatus)) {
                    if (item.status !== itemStatus) updated = true;
                    item.status = itemStatus;
                } else {
                    item.status = 'RED';
                    updated = true;
                }
            });
        });
        if (updated) saveToLocalStorage();
    }

    // --- Recalculation Rules ---
    function recalculateClientStatus(client) {
        const items = client.checklist || [];
        if (items.length === 0) {
            client.status = 'RED';
            return;
        }
        const allGreen = items.every(i => i.status === 'GREEN');
        const hasOrange = items.some(i => i.status === 'ORANGE');
        const allRed = items.every(i => i.status === 'RED');

        if (allGreen) {
            client.status = 'GREEN';
        } else if (hasOrange || items.some(i => i.status === 'GREEN')) {
            client.status = 'ORANGE';
        } else if (allRed) {
            client.status = 'RED';
        } else {
            client.status = 'ORANGE';
        }
    }

    function getProgressData(client) {
        const items = client.checklist || [];
        const total = items.length;
        if (total === 0) return { percent: 0, greenCount: 0, total: 0 };
        const greenCount = items.filter(i => i.status === 'GREEN').length;
        const percent = Math.round((greenCount / total) * 100);
        return { percent, greenCount, total };
    }

    // --- Rendering Functions ---
    function renderDashboard() {
        totalClientsCount.textContent = clients.length;
        completedClientsCount.textContent = clients.filter(c => c.status === 'GREEN').length;
        ongoingClientsCount.textContent = clients.filter(c => c.status === 'ORANGE').length;
        redClientsCount.textContent = clients.filter(c => c.status === 'RED').length;
    }

    function renderClientsTable() {
        const query = searchInput.value.toLowerCase().trim();
        const filterStatus = statusFilter.value;

        clientsTableBody.innerHTML = '';

        const filtered = clients.filter(c => {
            const matchesQuery = !query || 
                c.name.toLowerCase().includes(query) || 
                c.eventType.toLowerCase().includes(query) || 
                (c.venue && c.venue.toLowerCase().includes(query)) ||
                c.id.toLowerCase().includes(query);
            const matchesStatus = !filterStatus || c.status === filterStatus;
            return matchesQuery && matchesStatus;
        });

        if (filtered.length === 0) {
            clientsTableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 30px;">No client records found.</td></tr>`;
            return;
        }

        filtered.forEach(c => {
            const prog = getProgressData(c);
            const statusControl = isAdmin()
                ? `<select class="status-select ${c.status.toLowerCase()}" data-client-id="${escapeHtml(c.id)}">
                        <option value="RED" ${c.status === 'RED' ? 'selected' : ''}>🔴 RED — Not Done</option>
                        <option value="ORANGE" ${c.status === 'ORANGE' ? 'selected' : ''}>🟠 ORANGE — Ongoing</option>
                        <option value="GREEN" ${c.status === 'GREEN' ? 'selected' : ''}>🟢 GREEN — Done</option>
                    </select>`
                : `<span class="badge ${c.status.toLowerCase()}">${escapeHtml(c.status)}</span>`;
            const clientActions = isAdmin()
                ? `<button class="btn btn-secondary edit-client-btn" data-id="${escapeHtml(c.id)}"><i class="fa-solid fa-pen"></i> Edit</button>
                   <button class="btn btn-danger delete-client-btn" data-id="${escapeHtml(c.id)}"><i class="fa-solid fa-trash"></i></button>`
                : '';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><code>${escapeHtml(c.id)}</code></td>
                <td><strong>${escapeHtml(c.name)}</strong></td>
                <td>${escapeHtml(c.eventType)}</td>
                <td>${c.eventDate || 'N/A'}</td>
                <td>${escapeHtml(c.venue || 'N/A')}</td>
                <td>${statusControl}</td>
                <td>
                    <div class="progress-container">
                        <div class="progress-bar-bg">
                            <div class="progress-bar-fill" style="width: ${prog.percent}%"></div>
                        </div>
                        <span class="progress-text">${prog.percent}%</span>
                    </div>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-primary view-btn" data-id="${escapeHtml(c.id)}"><i class="fa-solid fa-eye"></i> View</button>
                        ${clientActions}
                    </div>
                </td>
            `;

            // Event Listeners for row actions
            const statusSelect = tr.querySelector('.status-select');
            if (statusSelect) {
                statusSelect.addEventListener('change', async (e) => {
                    if (!requireAdmin()) return;
                    const newStatus = e.target.value;
                    statusSelect.disabled = true;
                    try {
                        if (c.dbId != null) {
                            await updateCloudStatus('clients', c.dbId, newStatus);
                        }
                        c.status = newStatus;
                        saveToLocalStorage();
                        renderDashboard();
                        renderClientsTable();
                        showToast(
                            c.dbId != null
                                ? `Client overall status updated to ${newStatus} and saved to the cloud.`
                                : `Client status saved locally as ${newStatus}. Migrate local data to save it to the cloud.`,
                            'success'
                        );
                    } catch (error) {
                        console.error('Could not update client status:', error);
                        renderClientsTable();
                        showToast(`Could not save client status: ${error.message || 'Supabase request failed.'}`, 'error');
                    }
                });
            }

            tr.querySelector('.view-btn').addEventListener('click', () => openDetailsModal(c.id));
            if (isAdmin()) {
                tr.querySelector('.edit-client-btn').addEventListener('click', () => openClientModal(c));
                tr.querySelector('.delete-client-btn').addEventListener('click', () => promptDeleteClient(c.id));
            }

            clientsTableBody.appendChild(tr);
        });
    }

    // --- Event Listeners Setup ---
    function setupEventListeners() {
        searchInput.addEventListener('input', renderClientsTable);
        statusFilter.addEventListener('change', renderClientsTable);

        openAddClientModalBtn.addEventListener('click', () => openClientModal());
        closeClientModalBtn.addEventListener('click', closeClientModal);
        cancelClientBtn.addEventListener('click', closeClientModal);
        clientForm.addEventListener('submit', handleSaveClient);

        closeDetailsModalBtn.addEventListener('click', () => detailsModal.style.display = 'none');
        openAddChecklistBtn.addEventListener('click', () => openChecklistModal());

        closeChecklistModalBtn.addEventListener('click', closeChecklistModal);
        cancelChecklistBtn.addEventListener('click', closeChecklistModal);
        checklistForm.addEventListener('submit', handleSaveChecklist);

        confirmNoBtn.addEventListener('click', () => confirmModal.style.display = 'none');
        confirmYesBtn.addEventListener('click', executeConfirmedDeletion);

        // Export / Import
        exportBtn.addEventListener('click', exportJSONBackup);
        importBtn.addEventListener('click', () => importFile.click());
        importFile.addEventListener('change', handleImportJSON);
        migrateLocalDataBtn.addEventListener('click', handleMigrateLocalData);
        closeCreateViewerBtn.addEventListener('click', closeCreateViewerModal);
        cancelCreateViewerBtn.addEventListener('click', closeCreateViewerModal);
        createViewerForm.addEventListener('submit', handleCreateViewer);

        // Keyboard escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                clientModal.style.display = 'none';
                detailsModal.style.display = 'none';
                checklistModal.style.display = 'none';
                confirmModal.style.display = 'none';
                createViewerModal.style.display = 'none';
                viewerSignupModal.style.display = 'none';
            }
        });
    }

    function openCreateViewerModal() {
        if (!requireAdmin()) return;
        createViewerForm.reset();
        createViewerError.hidden = true;
        createViewerModal.style.display = 'flex';
        viewerEmailInput.focus();
    }

    function closeCreateViewerModal() {
        createViewerModal.style.display = 'none';
        createViewerForm.reset();
        createViewerError.hidden = true;
    }

    async function handleCreateViewer(event) {
        event.preventDefault();
        if (!requireAdmin()) return;

        createViewerError.hidden = true;
        createViewerSubmitBtn.disabled = true;
        createViewerSubmitBtn.textContent = 'Sending Invite...';

        try {
            const { data, error } = await supabaseClient.functions.invoke('create-viewer-account', {
                body: { email: viewerEmailInput.value.trim() }
            });
            if (error) throw error;
            if (!data || !data.success) {
                throw new Error(data?.error || 'The invitation could not be created.');
            }

            closeCreateViewerModal();
            showToast('Viewer invitation sent. They can sign in after accepting the email invite.', 'success');
        } catch (error) {
            console.error('Could not invite viewer:', error);
            createViewerError.textContent = error.message || 'Could not send the invitation. Please try again.';
            createViewerError.hidden = false;
        } finally {
            createViewerSubmitBtn.disabled = false;
            createViewerSubmitBtn.innerHTML = '<i class="fa-solid fa-envelope"></i> Send Invite';
        }
    }

    // --- Client CRUD & Photobooth Default Items ---
    function openClientModal(client = null) {
        if (!requireAdmin()) return;
        if (client) {
            clientModalTitle.textContent = 'Edit Client Record';
            clientIdField.value = client.id;
            clientNameInput.value = client.name;
            eventTypeInput.value = client.eventType;
            eventDateInput.value = client.eventDate;
            venueInput.value = client.venue || '';
        } else {
            clientModalTitle.textContent = 'Add New Client';
            clientIdField.value = '';
            clientForm.reset();
        }
        clientModal.style.display = 'flex';
    }

    function closeClientModal() {
        clientModal.style.display = 'none';
        clientForm.reset();
    }

    function handleSaveClient(e) {
        e.preventDefault();
        if (!requireAdmin()) return;
        const idVal = clientIdField.value;
        const name = clientNameInput.value.trim();
        const eventType = eventTypeInput.value.trim();
        const eventDate = eventDateInput.value;
        const venue = venueInput.value.trim();

        const nowStr = formatReadableDateTime(new Date());

        if (idVal) {
            // Edit
            const client = clients.find(c => c.id === idVal);
            if (client) {
                client.name = name;
                client.eventType = eventType;
                client.eventDate = eventDate;
                client.venue = venue;
                // Preserve existing status and checklist items
                saveToLocalStorage();
                initApp();
                closeClientModal();
                showToast('Client record updated successfully!', 'success');
            }
        } else {
            // Create New Client
            const newClientId = 'CL-' + Math.floor(1000 + Math.random() * 9000);
            
            // Create default checklist items (one example per category), Mandatory RED status
            const defaultChecklistItems = [
                { id: 'CHK-' + Date.now() + '-1', category: 'Throwback Pics', name: 'Throwback Pics', notes: '', dueDate: '', status: 'RED', dateAdded: nowStr, lastUpdated: nowStr },
                { id: 'CHK-' + Date.now() + '-2', category: 'Prenup (Pic)', name: 'Prenup (Pic)', notes: '', dueDate: '', status: 'RED', dateAdded: nowStr, lastUpdated: nowStr },
                { id: 'CHK-' + Date.now() + '-3', category: 'Prenup (AVP)', name: 'Prenup (AVP)', notes: '', dueDate: '', status: 'RED', dateAdded: nowStr, lastUpdated: nowStr },
                { id: 'CHK-' + Date.now() + '-4', category: 'SDE (Pic)', name: 'SDE (Pic)', notes: '', dueDate: '', status: 'RED', dateAdded: nowStr, lastUpdated: nowStr },
                { id: 'CHK-' + Date.now() + '-5', category: 'SDE (Vid)', name: 'SDE (Vid)', notes: '', dueDate: '', status: 'RED', dateAdded: nowStr, lastUpdated: nowStr },
                { id: 'CHK-' + Date.now() + '-6', category: 'Full Video', name: 'Full Video', notes: '', dueDate: '', status: 'RED', dateAdded: nowStr, lastUpdated: nowStr },
                { id: 'CHK-' + Date.now() + '-7', category: 'Ceremony Pics', name: 'Ceremony Pics', notes: '', dueDate: '', status: 'RED', dateAdded: nowStr, lastUpdated: nowStr },
                { id: 'CHK-' + Date.now() + '-8', category: 'Reception Pics', name: 'Reception Pics', notes: '', dueDate: '', status: 'RED', dateAdded: nowStr, lastUpdated: nowStr },
                { id: 'CHK-' + Date.now() + '-9', category: 'Links', name: 'Links', notes: '', dueDate: '', status: 'RED', dateAdded: nowStr, lastUpdated: nowStr },
                { id: 'CHK-' + Date.now() + '-10', category: 'Wedding Photos (Post)', name: 'Wedding Photos (Post)', notes: '', dueDate: '', status: 'RED', dateAdded: nowStr, lastUpdated: nowStr },
                { id: 'CHK-' + Date.now() + '-11', category: 'SDE Video (Post)', name: 'SDE Video (Post)', notes: '', dueDate: '', status: 'RED', dateAdded: nowStr, lastUpdated: nowStr },
                { id: 'CHK-' + Date.now() + '-12', category: 'Wedding Highlights', name: 'Wedding Highlights', notes: '', dueDate: '', status: 'RED', dateAdded: nowStr, lastUpdated: nowStr },
                { id: 'CHK-' + Date.now() + '-13', category: 'Note', name: 'Note', notes: '', dueDate: '', status: 'RED', dateAdded: nowStr, lastUpdated: nowStr }
            ];

            const newClient = {
                id: newClientId,
                name,
                eventType,
                eventDate,
                venue,
                status: 'RED', // Mandatory initial RED status
                dateAdded: nowStr,
                checklist: defaultChecklistItems
            };

            clients.push(newClient);
            saveToLocalStorage();
            initApp();
            closeClientModal();
            showToast('New client created with default checklist items (RED).', 'success');
        }
    }

    function promptDeleteClient(clientId) {
        if (!requireAdmin()) return;
        deleteTarget = { type: 'client', id: clientId };
        confirmTitle.textContent = 'Delete Client Record';
        confirmMessage.textContent = 'Are you sure you want to hide this client? The record and its checklist items will remain in the database.';
        confirmModal.style.display = 'flex';
    }

    // --- Checklist CRUD & Workflow ---
    function openDetailsModal(clientId) {
        currentClientId = clientId;
        renderDetailsModalContent();
        detailsModal.style.display = 'flex';
    }

    function renderDetailsModalContent() {
        const client = clients.find(c => c.id === currentClientId);
        if (!client) return;

        openAddChecklistBtn.hidden = !isAdmin();
        detailsClientName.textContent = client.name;
        detailsEventMeta.textContent = `${client.eventType} • ${client.eventDate} • ${client.venue || 'No Venue'}`;
        
        // Update overall badge
        detailsOverallBadge.className = `badge ${client.status.toLowerCase()}`;
        detailsOverallBadge.textContent = client.status;

        checklistTableBody.innerHTML = '';
        const items = client.checklist || [];

        if (items.length === 0) {
            const emptyMessage = isAdmin()
                ? "No checklist items found. Click 'Add Checklist Item' to start."
                : 'No checklist items found.';
            checklistTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">${emptyMessage}</td></tr>`;
            return;
        }

        items.forEach(item => {
            const itemStatus = isAdmin()
                ? `<select class="status-select ${item.status.toLowerCase()}" data-item-id="${escapeHtml(item.id)}">
                        <option value="RED" ${item.status === 'RED' ? 'selected' : ''}>🔴 RED — Not Done</option>
                        <option value="ORANGE" ${item.status === 'ORANGE' ? 'selected' : ''}>🟠 ORANGE — Ongoing</option>
                        <option value="GREEN" ${item.status === 'GREEN' ? 'selected' : ''}>🟢 GREEN — Done</option>
                    </select>`
                : `<span class="badge ${item.status.toLowerCase()}">${escapeHtml(item.status)}</span>`;
            const itemActions = isAdmin()
                ? `<div class="action-buttons">
                        <button class="btn btn-secondary edit-chk-btn" data-id="${escapeHtml(item.id)}"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn btn-danger delete-chk-btn" data-id="${escapeHtml(item.id)}"><i class="fa-solid fa-trash"></i></button>
                    </div>`
                : '';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span class="badge" style="background:#e0f2fe; color:#0369a1;">${escapeHtml(item.category)}</span></td>
                <td>
                    <strong>${escapeHtml(item.name)}</strong>
                    ${item.notes ? (item.category === 'Links' ? `<div style="font-size:0.8rem;"><a href="${escapeHtml(item.notes)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.notes)}</a></div>` : `<div style="font-size:0.8rem; color:var(--text-muted);">${escapeHtml(item.notes)}</div>`) : ''}
                </td>
                <td>${item.dueDate || 'No Due Date'}</td>
                <td>${itemStatus}</td>
                <td style="font-size: 0.8rem; color: var(--text-muted);">
                    Added: ${item.dateAdded}<br>Updated: ${item.lastUpdated}
                </td>
                <td>${itemActions}</td>
            `;

            // Status change listener
            const statusSelect = tr.querySelector('.status-select');
            if (statusSelect) {
                statusSelect.addEventListener('change', async (e) => {
                    if (!requireAdmin()) return;
                    const newStatus = e.target.value;
                    const previousStatus = item.status;
                    const previousClientStatus = client.status;
                    const previousLastUpdated = item.lastUpdated;
                    const updatedAt = new Date().toISOString();
                    statusSelect.disabled = true;

                    try {
                        if (item.dbId != null) {
                            await updateCloudStatus('checklist_items', item.dbId, newStatus, updatedAt);
                        }

                        item.status = newStatus;
                        item.lastUpdated = formatReadableDateTime(new Date(updatedAt));
                        recalculateClientStatus(client);

                        if (client.dbId != null) {
                            try {
                                await updateCloudStatus('clients', client.dbId, client.status, updatedAt);
                            } catch (error) {
                                item.status = previousStatus;
                                client.status = previousClientStatus;
                                item.lastUpdated = previousLastUpdated;
                                if (item.dbId != null) {
                                    try {
                                        await updateCloudStatus(
                                            'checklist_items',
                                            item.dbId,
                                            previousStatus,
                                            new Date().toISOString()
                                        );
                                    } catch (rollbackError) {
                                        console.error('Could not roll back checklist status after client status update failed:', rollbackError);
                                    }
                                }
                                throw error;
                            }
                        }

                        saveToLocalStorage();
                        renderDetailsModalContent();
                        renderDashboard();
                        renderClientsTable();

                        const labels = { RED: 'Not Done', ORANGE: 'Ongoing', GREEN: 'Done' };
                        showToast(
                            item.dbId != null
                                ? `Status updated to ${labels[newStatus]} and saved to the cloud.`
                                : `Status updated to ${labels[newStatus]} locally. Migrate local data to save it to the cloud.`,
                            'success'
                        );
                    } catch (error) {
                        console.error('Could not update checklist status:', error);
                        renderDetailsModalContent();
                        renderDashboard();
                        renderClientsTable();
                        showToast(`Could not save task status: ${error.message || 'Supabase request failed.'}`, 'error');
                    }
                });
            }

            if (isAdmin()) {
                tr.querySelector('.edit-chk-btn').addEventListener('click', () => openChecklistModal(item));
                tr.querySelector('.delete-chk-btn').addEventListener('click', () => promptDeleteChecklistItem(item.id));
            }

            checklistTableBody.appendChild(tr);
        });
    }

    function openChecklistModal(item = null) {
        if (!requireAdmin()) return;
        if (item) {
            checklistModalTitle.textContent = 'Edit Checklist Item';
            checklistItemIdField.value = item.id;
            checklistCategoryInput.value = item.category;
            checklistItemNameInput.value = item.name;
            checklistNotesInput.value = item.notes || '';
            checklistDueDateInput.value = item.dueDate || '';
        } else {
            checklistModalTitle.textContent = 'Add New Checklist Item';
            checklistItemIdField.value = '';
            checklistForm.reset();
        }
        checklistModal.style.display = 'flex';
    }

    function closeChecklistModal() {
        checklistModal.style.display = 'none';
        checklistForm.reset();
    }

    function handleSaveChecklist(e) {
        e.preventDefault();
        if (!requireAdmin()) return;
        const client = clients.find(c => c.id === currentClientId);
        if (!client) return;

        const itemId = checklistItemIdField.value;
        const category = checklistCategoryInput.value;
        const name = checklistItemNameInput.value.trim();
        const notes = checklistNotesInput.value.trim();
        const dueDate = checklistDueDateInput.value;
        const nowStr = formatReadableDateTime(new Date());

        if (itemId) {
            // Edit existing item
            const item = client.checklist.find(i => i.id === itemId);
            if (item) {
                item.category = category;
                item.name = name;
                item.notes = notes;
                item.dueDate = dueDate;
                item.lastUpdated = nowStr;
                // Preserve original status and dateAdded
                recalculateClientStatus(client);
                saveToLocalStorage();
                initApp();
                renderDetailsModalContent();
                closeChecklistModal();
                showToast('Checklist task updated successfully.', 'success');
            }
        } else {
            // Create new item (Mandatory RED status)
            const newItem = {
                id: 'CHK-' + Date.now(),
                category,
                name,
                notes,
                dueDate,
                status: 'RED', // Mandatory default
                dateAdded: nowStr,
                lastUpdated: nowStr
            };

            if (!client.checklist) client.checklist = [];
            client.checklist.push(newItem);

            recalculateClientStatus(client);
            saveToLocalStorage();
            initApp();
            renderDetailsModalContent();
            closeChecklistModal();
            showToast('New task added with RED status.', 'success');
        }
    }

    function promptDeleteChecklistItem(itemId) {
        if (!requireAdmin()) return;
        deleteTarget = { type: 'checklist', id: itemId, clientId: currentClientId };
        confirmTitle.textContent = 'Delete Checklist Item';
        confirmMessage.textContent = 'Are you sure you want to delete this checklist item?';
        confirmModal.style.display = 'flex';
    }

    async function executeConfirmedDeletion() {
        if (!deleteTarget) return;
        if (!requireAdmin()) return;

        confirmYesBtn.disabled = true;
        try {
            if (deleteTarget.type === 'client') {
                const client = clients.find(c => c.id === deleteTarget.id);
                if (!client) throw new Error('The client record could not be found.');

                if (client.dbId != null) {
                    const { data, error } = await supabaseClient
                        .from('clients')
                        .update({ deleted_at: new Date().toISOString() })
                        .eq('id', client.dbId)
                        .is('deleted_at', null)
                        .select('id')
                        .maybeSingle();

                    if (error) throw error;
                    if (!data) {
                        throw new Error('No cloud record was updated. It may already be deleted or you may not have permission.');
                    }
                }

                clients = clients.filter(c => c.id !== deleteTarget.id);
                saveToLocalStorage();
                initApp();
                showToast(
                    client.dbId != null
                        ? 'Client soft-deleted. The record remains in the database.'
                        : 'Client removed from this local view. It has not been saved to the cloud.',
                    'success'
                );
            } else if (deleteTarget.type === 'checklist') {
                const client = clients.find(c => c.id === deleteTarget.clientId);
                if (client) {
                    client.checklist = client.checklist.filter(i => i.id !== deleteTarget.id);
                    recalculateClientStatus(client);
                    saveToLocalStorage();
                    initApp();
                    renderDetailsModalContent();
                    showToast('Checklist item deleted.', 'success');
                }
            }

            confirmModal.style.display = 'none';
            deleteTarget = null;
        } catch (error) {
            console.error('Could not delete the selected record:', error);
            showToast(`Could not delete the selected record: ${error.message || 'Supabase request failed.'}`, 'error');
        } finally {
            confirmYesBtn.disabled = false;
        }
    }

    // --- Backup & Restore ---
    function exportJSONBackup() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(clients, null, 2));
        const dlAnchor = document.createElement('a');
        dlAnchor.setAttribute("href", dataStr);
        dlAnchor.setAttribute("download", `eventsync_backup_${formatDateForFilename(new Date())}.json`);
        document.body.appendChild(dlAnchor);
        dlAnchor.click();
        dlAnchor.remove();
        showToast('JSON backup exported successfully.', 'success');
    }

    function handleImportJSON(e) {
        if (!requireAdmin()) {
            importFile.value = '';
            return;
        }
        const fileReader = new FileReader();
        if (e.target.files[0]) {
            fileReader.readAsText(e.target.files[0], "UTF-8");
            fileReader.onload = (event) => {
                try {
                    const importedData = JSON.parse(event.target.result);
                    if (Array.isArray(importedData)) {
                        clients = importedData;
                        verifyAndMigrateData();
                        saveToLocalStorage();
                        initApp();
                        showToast('Database restored successfully from JSON.', 'success');
                    } else {
                        showToast('Invalid backup file format.', 'error');
                    }
                } catch (err) {
                    showToast('Error parsing JSON file.', 'error');
                }
                importFile.value = '';
            };
        }
    }

    async function handleMigrateLocalData() {
        if (!requireAdmin()) return;
        let localClients;
        try {
            const storedClients = localStorage.getItem('event_sync_clients');
            localClients = storedClients ? JSON.parse(storedClients) : [];
            if (!Array.isArray(localClients)) {
                throw new Error('The saved local data is not a valid client list.');
            }
            if (localClients.length === 0) {
                showToast('No local client records were found in this browser.', 'error');
                return;
            }
            if (localClients.some(client =>
                !client || client.id == null || String(client.id).trim() === '' ||
                (client.checklist != null && !Array.isArray(client.checklist)) ||
                (client.checklist || []).some(item =>
                    !item || item.id == null || String(item.id).trim() === ''
                )
            )) {
                throw new Error('Some local records are missing stable client or checklist IDs.');
            }
        } catch (error) {
            console.error('Could not read local records for migration:', error);
            showToast(error.message || 'Could not read local records for migration.', 'error');
            return;
        }

        const confirmation = window.confirm(
            `Migrate ${localClients.length} local client record(s) and their checklist items to Supabase? ` +
            'Your localStorage backup will be kept. Existing cloud records are checked to prevent duplicates.'
        );
        if (!confirmation) return;

        migrateLocalDataBtn.disabled = true;
        const originalButtonText = migrateLocalDataBtn.textContent.trim();
        migrateLocalDataBtn.textContent = 'Migrating...';

        try {
            await migrateLocalClientsToSupabase(localClients);
        } catch (error) {
            console.error('Local data migration failed:', error);
            showToast(
                `Migration stopped: ${error.message || 'Supabase request failed.'} ` +
                'Local data is unchanged. You can safely retry after fixing the issue.',
                'error'
            );
            migrateLocalDataBtn.disabled = false;
            migrateLocalDataBtn.textContent = originalButtonText;
            return;
        }

        showToast('Local records migrated to Supabase. Your browser backup was kept.', 'success');
        try {
            const loadVersion = ++authLoadVersion;
            await loadClientsFromSupabase(loadVersion);
        } catch (error) {
            console.error('Migration succeeded, but reloading cloud records failed:', error);
            showToast('Migration succeeded, but the cloud list could not be refreshed. Reload the page.', 'error');
        } finally {
            migrateLocalDataBtn.disabled = false;
            migrateLocalDataBtn.textContent = originalButtonText;
        }
    }

    async function migrateLocalClientsToSupabase(localClients) {
        const sourceClientIds = new Set(localClients.map(client => String(client.id)));
        if (sourceClientIds.size !== localClients.length) {
            throw new Error('Duplicate local client IDs were found; migration was stopped.');
        }

        const localItemsByClientId = new Map();
        for (const client of localClients) {
            const items = client.checklist || [];
            const itemIds = items.map(item => String(item.id));
            if (itemIds.some(id => id.trim() === '')) {
                throw new Error('A checklist item is missing its local ID; migration was stopped.');
            }
            if (new Set(itemIds).size !== itemIds.length) {
                throw new Error('Duplicate checklist item IDs were found; migration was stopped.');
            }
            localItemsByClientId.set(String(client.id), new Set(itemIds));
        }

        const cloudClients = await fetchAllSupabaseRows(
            supabaseClient.from('clients').select('id, local_storage_id')
        );
        const cloudClientIds = new Set();
        for (const row of cloudClients) {
            if (!row.local_storage_id || !sourceClientIds.has(row.local_storage_id)) {
                throw new Error(
                    'The clients table contains records that are not linked to this local backup. ' +
                    'Review the cloud data before migrating to avoid duplicates.'
                );
            }
            if (cloudClientIds.has(row.local_storage_id)) {
                throw new Error('The cloud contains duplicate migration IDs; migration was stopped.');
            }
            cloudClientIds.add(row.local_storage_id);
        }

        const cloudChecklistItems = await fetchAllSupabaseRows(
            supabaseClient.from('checklist_items').select('client_id, local_storage_id')
        );
        const localItemIdsByCloudClientId = new Map(
            cloudClients.map(row => [
                row.id,
                localItemsByClientId.get(row.local_storage_id)
            ])
        );
        for (const item of cloudChecklistItems) {
            const sourceItemIds = localItemIdsByCloudClientId.get(item.client_id);
            if (!item.local_storage_id || !sourceItemIds || !sourceItemIds.has(item.local_storage_id)) {
                throw new Error(
                    'The checklist_items table contains records that are not linked to this local backup. ' +
                    'Review the cloud data before migrating to avoid duplicates.'
                );
            }
        }

        for (const client of localClients) {
            const sourceId = String(client.id);
            const clientPayload = {
                local_storage_id: sourceId,
                client_name: client.name || '',
                event_type: client.eventType || null,
                event_date: client.eventDate || null,
                ceremony_date: client.ceremonyDate || null,
                reception_date: client.receptionDate || null,
                event_time: client.eventTime || null,
                venue: client.venue || null,
                address: client.address || null,
                contact_number: client.contactNumber || null,
                email: client.email || null,
                facebook_name: client.facebookName || null,
                color_motif: client.colorMotif || null,
                guest_count: client.guestCount ?? null,
                package_price: client.packagePrice ?? null,
                status: (client.status || 'RED').toLowerCase(),
                notes: client.notes || null
            };
            const { data: savedClient, error: clientError } = await supabaseClient
                .from('clients')
                .upsert(clientPayload, { onConflict: 'local_storage_id' })
                .select('id')
                .single();

            if (clientError) throw clientError;

            const checklistItems = (client.checklist || []).map(item => ({
                client_id: savedClient.id,
                local_storage_id: String(item.id),
                task_name: item.name || '',
                category: item.category || null,
                notes: item.notes || null,
                due_date: item.dueDate || null,
                status: (item.status || 'RED').toLowerCase(),
                is_completed: (item.status || '').toUpperCase() === 'GREEN'
            }));

            if (checklistItems.length > 0) {
                const { error: itemsError } = await supabaseClient
                    .from('checklist_items')
                    .upsert(checklistItems, { onConflict: 'client_id,local_storage_id' });
                if (itemsError) throw itemsError;
            }
        }
    }

    async function fetchAllSupabaseRows(query) {
        const rows = [];
        const pageSize = 1000;
        for (let offset = 0; ; offset += pageSize) {
            const { data, error } = await query.range(offset, offset + pageSize - 1);
            if (error) throw error;
            rows.push(...data);
            if (data.length < pageSize) return rows;
        }
    }

    // --- Storage & Utilities ---
    async function updateCloudStatus(table, rowId, status, updatedAt = new Date().toISOString()) {
        const payload = {
            status: status.toLowerCase(),
            updated_at: updatedAt
        };
        if (table === 'checklist_items') {
            payload.is_completed = status === 'GREEN';
        }

        const { data, error } = await supabaseClient
            .from(table)
            .update(payload)
            .eq('id', rowId)
            .select('id')
            .maybeSingle();

        if (error) throw error;
        if (!data) {
            throw new Error('No cloud record was updated. Check your access permissions and try again.');
        }
    }

    function saveToLocalStorage() {
        localStorage.setItem('event_sync_clients', JSON.stringify(clients));
    }

    function formatReadableDateTime(dateObj) {
        const options = { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' };
        return dateObj.toLocaleDateString('en-US', options);
    }

    function formatDateForFilename(dateObj) {
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const d = String(dateObj.getDate()).padStart(2, '0');
        return `${y}${m}${d}`;
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")
                  .replace(/"/g, "&quot;")
                  .replace(/'/g, "&#039;");
    }

    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
});