// 1. Supabase Configuration
// ==========================================
const SUPABASE_URL = 'https://fjrllvtkbehysuhapnob.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqcmxsdnRrYmVoeXN1aGFwbm9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExODI1OTcsImV4cCI6MjA4Njc1ODU5N30.GcrORx1vnZ4BAm6ZSjxyFtvBeOZGDLofORMz-VnG55k'; 

// Error မတက်အောင် ကာကွယ်ထားခြင်း
const sb = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

if (!sb) {
    console.error("🚨 Supabase script is missing in HTML!");
    alert("System Error: Database connection failed. Please check HTML scripts.");
}

// 2. AUTH Logic
// ==========================================
const auth = {
    currentUser: null,
    init() {
        const session = sessionStorage.getItem('user_session');
        if (session) {
            this.currentUser = JSON.parse(session);
            this.applyRole();
            app.init();
        } else {
            const overlay = document.getElementById('login-overlay');
            if(overlay) overlay.classList.remove('hidden');
        }
    },
    login(e) {
        e.preventDefault();
        const u = document.getElementById('login-user').value.toLowerCase();
        const p = document.getElementById('login-pass').value;
        if ((u === 'admin' && p === '1234') || (u === 'guest' && p === '1care@2025')) {
            this.setSession({ role: u === 'admin' ? 'admin' : 'viewer' });
        } else {
            alert('Invalid Login!');
        }
    },
    setSession(user) {
        this.currentUser = user;
        sessionStorage.setItem('user_session', JSON.stringify(user));
        document.getElementById('login-overlay').classList.add('hidden');
        this.applyRole();
        app.init();
    },
    logout() { 
        sessionStorage.removeItem('user_session'); 
        location.reload(); 
    },
    applyRole() {
        const isAdmin = this.currentUser.role === 'admin';
        const badge = document.getElementById('user-role-badge');
        if(badge) badge.textContent = isAdmin ? 'Admin' : 'Viewer';
        document.querySelectorAll('.admin-only').forEach(el => el.classList.toggle('hidden', !isAdmin));
    }
};

// 3. Database Operations
// ==========================================
const db = {
    async getAll() {
        if(!sb) return [];
        const { data, error } = await sb.from('employees').select('*');
        if (error) { console.error("DB Error:", error); return []; }
        return data;
    },
    async add(emp) {
        const { error } = await sb.from('employees').insert([emp]);
        return !error;
    },
    async update(id, emp) {
        const { error } = await sb.from('employees').update(emp).eq('id', id);
        return !error;
    },
    async delete(id) {
        const { error } = await sb.from('employees').delete().eq('id', id);
        return !error;
    }
};

// 4. Main App Logic
// ==========================================
const app = {
    data: [],
    state: { view: 'list', dept: 'All', search: '' },

    async init() {
        this.toggleLoading(true);
        this.data = await db.getAll();
        this.toggleLoading(false);
        this.renderSidebar();
        this.renderList();
        this.renderChart();
        
        const searchInput = document.getElementById('search-input');
        if(searchInput) {
            searchInput.oninput = (e) => {
                this.state.search = e.target.value.toLowerCase();
                this.renderList();
            };
        }
    },

    toggleLoading(show) {
        const loader = document.getElementById('loading-overlay');
        if(loader) {
            loader.classList.toggle('hidden', !show);
            loader.classList.toggle('flex', show);
        }
    },

    switchView(view) {
        this.state.view = view;
        document.getElementById('view-list').classList.toggle('hidden', view !== 'list');
        document.getElementById('view-chart').classList.toggle('hidden', view !== 'chart');
        
        const btnList = document.getElementById('btn-list');
        const btnChart = document.getElementById('btn-chart');

        if(view === 'list') {
            btnList.classList.add('bg-white', 'text-indigo-600', 'shadow');
            btnChart.classList.remove('bg-white', 'text-indigo-600', 'shadow');
        } else {
            btnChart.classList.add('bg-white', 'text-indigo-600', 'shadow');
            btnList.classList.remove('bg-white', 'text-indigo-600', 'shadow');
            this.renderChart();
        }
    },

    // --- Sidebar ---
    renderSidebar() {
        const depts = {};
        this.data.forEach(e => depts[e.dept] = (depts[e.dept] || 0) + 1);
        const sidebar = document.getElementById('dept-sidebar');
        if(!sidebar) return;

        sidebar.innerHTML = `<button onclick="app.filterDept('All')" class="w-full text-left px-3 py-2 rounded mb-1 text-sm font-bold flex justify-between ${this.state.dept==='All' ? 'bg-indigo-50 text-indigo-700':'text-slate-600 hover:bg-slate-100'}">All Depts <span>${this.data.length}</span></button>`;
        
        Object.entries(depts).sort((a,b)=>b[1]-a[1]).forEach(([d, c]) => {
            sidebar.innerHTML += `<button onclick="app.filterDept('${d}')" class="w-full text-left px-3 py-2 rounded mb-1 text-sm flex justify-between ${this.state.dept===d ? 'bg-indigo-50 text-indigo-700 font-bold':'text-slate-600 hover:bg-slate-100'}"><span class="truncate pr-2">${d}</span> <span class="bg-slate-200 px-1.5 rounded text-xs">${c}</span></button>`;
        });
        document.getElementById('total-count').innerText = this.data.length;
    },

    filterDept(d) {
        this.state.dept = d;
        this.renderSidebar();
        this.renderList();
        this.renderChart();
    },

    // --- List View ---
    renderList() {
        const grid = document.getElementById('employee-grid');
        if(!grid) return;
        grid.innerHTML = '';
        const filtered = this.data.filter(e => {
            const matchDept = this.state.dept === 'All' || e.dept === this.state.dept;
            const matchSearch = e.name.toLowerCase().includes(this.state.search);
            return matchDept && matchSearch;
        });

        filtered.sort((a,b) => (b.rank || 0) - (a.rank || 0));

        filtered.forEach(e => {
            const isAdmin = auth.currentUser.role === 'admin';
            grid.innerHTML += `
                <div class="bg-white p-5 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-all">
                    <div class="flex justify-between items-start mb-3">
                        <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 border">${e.name.substring(0,2).toUpperCase()}</div>
                        <div class="flex gap-1">
                            <button onclick="app.viewJD(${e.id})" class="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded font-bold">JD</button>
                            ${isAdmin ? `<button onclick="app.editEmployee(${e.id})" class="text-slate-400 p-1 hover:text-blue-600"><i class="ph ph-pencil-simple"></i></button><button onclick="app.deleteEmployee(${e.id})" class="text-slate-400 p-1 hover:text-red-600"><i class="ph ph-trash"></i></button>` : ''}
                        </div>
                    </div>
                    <h3 class="font-bold text-slate-800">${e.name}</h3>
                    <p class="text-xs text-indigo-600 font-semibold mb-2">${e.position}</p>
                    <div class="flex items-center justify-between mt-2">
                         <span class="text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded border">${e.branch}</span>
                         <span class="text-[10px] px-2 py-0.5 rounded border font-bold bg-purple-50">Rank ${e.rank || '-'}</span>
                    </div>
                </div>`;
        });
    },

    // --- Chart Hierarchy Logic ---
    buildTree(parentId) {
        return this.data
            .filter(emp => emp.manager_id === parentId)
            .map(emp => ({ ...emp, children: this.buildTree(emp.id) }));
    },

    createNode(emp) {
        // ပုံစံအတိုင်း ခရမ်းရောင်အနားသတ်နှင့် Card ဒီဇိုင်း
        return `
            <div class="bg-indigo-50/30 p-4 rounded-xl shadow-sm border-l-[6px] border-indigo-500 min-w-[220px] text-left relative z-10 mx-2">
                <div class="font-bold text-slate-800 text-[16px]">${emp.name}</div>
                <div class="text-[12px] text-slate-500 mt-1">${emp.position}</div>
                <div class="flex justify-between items-center mt-3 pt-2 border-t border-slate-200/60">
                    <span class="text-[10px] text-slate-400 font-bold uppercase">${emp.branch || 'YGN'}</span>
                    <span class="text-[10px] bg-white px-2 py-0.5 rounded-full font-bold text-slate-700 shadow-sm border border-slate-100">R-${emp.rank || '0'}</span>
                </div>
            </div>`;
    },

    renderTree(staffList) {
        if (!staffList || staffList.length === 0) return '';
        let html = '<ul class="flex justify-center gap-4 mt-8">';
        staffList.forEach(emp => {
            html += `<li class="flex flex-col items-center relative">
                ${this.createNode(emp)}
                ${this.renderTree(emp.children)}
            </li>`;
        });
        html += '</ul>';
        return html;
    },

    renderChart() {
        const root = document.getElementById('org-tree-root');
        if (!root) return;
        root.innerHTML = '';

        const depts = {};
        const sourceData = this.state.dept === 'All' ? this.data : this.data.filter(e => e.dept === this.state.dept);
        
        sourceData.forEach(e => {
            if (!depts[e.dept]) depts[e.dept] = [];
            depts[e.dept].push(e);
        });

        let html = '<div class="flex flex-col items-center gap-16 w-full pt-4">';
        for (const [deptName, staff] of Object.entries(depts)) {
            
            // Department Header (ပုံထဲက အစိမ်းရောင် Box)
            html += `
                <div class="flex flex-col items-center w-full">
                    <div class="bg-green-50 text-green-700 border border-green-200 px-6 py-2 rounded-2xl font-bold text-lg shadow-sm z-20">
                        ${deptName}
                    </div>
                    <div class="w-full flex justify-center">`;
            
            const maxRank = Math.max(...staff.map(s => s.rank || 0));
            const heads = staff.filter(s => (s.rank || 0) === maxRank);
            
            html += '<ul class="flex justify-center gap-8 mt-6">';
            heads.forEach(head => {
                const branch = { ...head, children: this.buildTree(head.id) };
                html += `<li class="flex flex-col items-center relative">
                            ${this.createNode(branch)}
                            ${this.renderTree(branch.children)}
                         </li>`;
            });
            html += '</ul></div></div>';
        }
        html += '</div>';
        root.innerHTML = html;
    },

    // --- Actions ---
    updateManagerList(currentId = null) {
        const select = document.getElementById('inp-manager');
        if(!select) return;
        select.innerHTML = '<option value="">None (Top Boss)</option>';
        this.data.forEach(emp => {
            if (emp.id != currentId) {
                const opt = document.createElement('option');
                opt.value = emp.id;
                opt.textContent = `${emp.name} (${emp.position})`;
                select.appendChild(opt);
            }
        });
    },

    openAddModal() {
        document.getElementById('emp-modal').classList.remove('hidden');
        document.getElementById('modal-title').innerText = "Add New Employee";
        document.querySelector('#emp-modal form').reset();
        document.getElementById('inp-id').value = ""; 
        this.updateManagerList();
    },

    editEmployee(id) {
        const emp = this.data.find(e => e.id == id);
        if(!emp) return;
        document.getElementById('emp-modal').classList.remove('hidden');
        document.getElementById('modal-title').innerText = "Edit Employee";
        
        document.getElementById('inp-id').value = emp.id; 
        document.getElementById('inp-name').value = emp.name;
        document.getElementById('inp-company').value = emp.company || "";
        document.getElementById('inp-dept').value = emp.dept || "";
        document.getElementById('inp-branch').value = emp.branch || "";
        document.getElementById('inp-pos').value = emp.position || "";
        document.getElementById('inp-rank').value = emp.rank || 1;
        document.getElementById('inp-jd').value = emp.jd || "";
        
        this.updateManagerList(emp.id);
        const mInput = document.getElementById('inp-manager');
        if(mInput) mInput.value = emp.manager_id || "";
    },

    async saveEmployee(e) {
        e.preventDefault();
        this.toggleLoading(true);
        const idInput = document.getElementById('inp-id').value; 
        const mInput = document.getElementById('inp-manager');
        const mId = mInput ? mInput.value : null;

        const empObj = {
            name: document.getElementById('inp-name').value,
            company: document.getElementById('inp-company').value,
            dept: document.getElementById('inp-dept').value,
            branch: document.getElementById('inp-branch').value,
            position: document.getElementById('inp-pos').value,
            rank: parseInt(document.getElementById('inp-rank').value) || 1,
            jd: document.getElementById('inp-jd').value,
            manager_id: mId ? parseInt(mId) : null
        };

        const success = idInput ? await db.update(parseInt(idInput), empObj) : await db.add(empObj);
        if (success) {
            this.data = await db.getAll(); 
            this.closeModal('emp-modal');
            this.init();
        }
        this.toggleLoading(false);
    },

    async deleteEmployee(id) {
        if(confirm("Delete this employee?")) {
            this.toggleLoading(true);
            if(await db.delete(id)) {
                this.data = await db.getAll();
                this.init();
            }
            this.toggleLoading(false);
        }
    },

    viewJD(id) {
        const emp = this.data.find(e => e.id == id);
        if(!emp) return;
        document.getElementById('jd-name').innerText = emp.name;
        document.getElementById('jd-pos').innerText = emp.position;
        document.getElementById('jd-id-display').innerText = emp.id;
        document.getElementById('jd-rank-display').innerText = emp.rank || '-';
        document.getElementById('jd-avatar').innerText = emp.name.substring(0,2).toUpperCase();
        document.getElementById('jd-dept').innerText = emp.dept;
        document.getElementById('jd-branch').innerText = emp.branch;
        document.getElementById('jd-company').innerText = emp.company;
        document.getElementById('jd-content').innerText = emp.jd || "No Description.";
        
        const modal = document.getElementById('jd-view-modal');
        if(modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    },

    closeModal(id) { 
        const modal = document.getElementById(id);
        if(modal) {
            modal.classList.add('hidden'); 
            modal.classList.remove('flex');
        }
    }
};

window.addEventListener('DOMContentLoaded', () => auth.init());
