// 1. Supabase Configuration
// ==========================================
const SUPABASE_URL = 'https://fjrllvtkbehysuhapnob.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqcmxsdnRrYmVoeXN1aGFwbm9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExODI1OTcsImV4cCI6MjA4Njc1ODU5N30.GcrORx1vnZ4BAm6ZSjxyFtvBeOZGDLofORMz-VnG55k'; // သင်၏ Key ကို ဒီနေရာမှာ ပြန်ထည့်ပါ
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. AUTH Logic (Login & Roles)
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
            document.getElementById('login-overlay').classList.remove('hidden');
        }
    },
    async login(e) {
    e.preventDefault();
    
    // User ရိုက်ထည့်လိုက်တဲ့ Data ကို ယူမယ်
    const u = document.getElementById('login-user').value.toLowerCase();
    const p = document.getElementById('login-pass').value;

    try {
        // Backend API ဆီကို Fetch သုံးပြီး လှမ်းပို့ပါမယ်
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            // Username နဲ့ Password ကို API ဆီ ပို့လိုက်ပါပြီ
            body: JSON.stringify({ username: u, password: p })
        });

        // Backend က ပြန်ပို့လိုက်တဲ့ အဖြေ (Response) ကို ယူမယ်
        const data = await response.json();

        if (data.success) {
            // Login အောင်မြင်သွားရင် Session ထဲ မှတ်မယ်
            this.setSession({ role: data.role, token: data.token });
        } else {
            // မှားနေရင် Backend က ပို့တဲ့ Message ကို Alert ပြမယ်
            alert(data.message);
        }
    } catch (error) {
        console.error('Error connecting to API:', error);
        alert('Server Error. Please try again later.');
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
        document.getElementById('user-role-badge').textContent = isAdmin ? 'Admin' : 'Viewer';
        document.querySelectorAll('.admin-only').forEach(el => el.classList.toggle('hidden', !isAdmin));
    }
};

// 3. Database Operations
// ==========================================
const db = {
    async getAll() {
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

// 4. Chart Controls (Zoom & Reset)
// ==========================================
const chart = {
    scale: 1,
    zoom(delta) {
        this.scale = Math.max(0.3, Math.min(2, this.scale + delta));
        const root = document.getElementById('org-tree-root');
        
        // Zoom လုပ်တဲ့ ဗဟိုမှတ်ကို အပေါ်ဘက် အလယ် (top center) သို့မဟုတ် (top left) လို့ ပေးပါမယ်
        root.style.transformOrigin = 'top center'; 
        root.style.transform = `scale(${this.scale})`;
    },
    reset() { 
        this.scale = 1; 
        const root = document.getElementById('org-tree-root');
        root.style.transformOrigin = 'top center';
        root.style.transform = `scale(1)`; 
    }
};

// 5. Main App Logic
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
        
        document.getElementById('search-input').oninput = (e) => {
            this.state.search = e.target.value.toLowerCase();
            this.renderList();
        };
    },

    toggleLoading(show) {
        const loader = document.getElementById('loading-overlay');
        loader.classList.toggle('hidden', !show);
        loader.classList.toggle('flex', show);
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

    // --- Sidebar & Filtering ---
    renderSidebar() {
        const depts = {};
        this.data.forEach(e => depts[e.dept] = (depts[e.dept] || 0) + 1);
        const sidebar = document.getElementById('dept-sidebar');
        
        sidebar.innerHTML = `<button onclick="app.filterDept('All')" class="w-full text-left px-3 py-2 rounded mb-1 text-sm font-bold flex justify-between ${this.state.dept==='All' ? 'bg-indigo-50 text-indigo-700':'text-slate-600'}">All Depts <span>${this.data.length}</span></button>`;
        
        Object.entries(depts).sort((a,b)=>b[1]-a[1]).forEach(([d, c]) => {
            sidebar.innerHTML += `<button onclick="app.filterDept('${d}')" class="w-full text-left px-3 py-2 rounded mb-1 text-sm flex justify-between ${this.state.dept===d ? 'bg-indigo-50 text-indigo-700 font-bold':'text-slate-600'}"><span class="truncate pr-2">${d}</span> <span class="bg-slate-200 px-1.5 rounded text-xs">${c}</span></button>`;
        });
        document.getElementById('total-count').innerText = this.data.length;
    },

    filterDept(d) {
        this.state.dept = d;
        this.renderSidebar();
        this.renderList();
        this.renderChart();
    },

    // --- List View Rendering ---
    renderList() {
        const grid = document.getElementById('employee-grid');
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
                            ${isAdmin ? `<button onclick="app.editEmployee(${e.id})" class="text-slate-400 p-1"><i class="ph ph-pencil-simple"></i></button><button onclick="app.deleteEmployee(${e.id})" class="text-slate-400 p-1"><i class="ph ph-trash"></i></button>` : ''}
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

    // --- Hierarchy Chart Logic ---
    buildTree(parentId) {
        return this.data
            .filter(emp => emp.manager_id === parentId)
            .map(emp => ({ ...emp, children: this.buildTree(emp.id) }));
    },

    createNode(emp) {
        const isAdmin = auth.currentUser.role === 'admin';
        return `
            <div class="tree-node rank-med group">
                <div class="font-bold truncate text-slate-700">${emp.name}</div>
                <div class="text-[10px] text-slate-500 truncate opacity-90">${emp.position}</div>
                <div class="flex justify-between items-center mt-1">
                    <div class="text-[9px] text-slate-400">${emp.branch}</div>
                    <div class="text-[9px] font-bold bg-white/50 px-1 rounded text-slate-600">R-${emp.rank||'?'}</div>
                </div>
                <div class="node-actions">
                    <button onclick="app.viewJD(${emp.id})" class="text-[10px] text-white bg-indigo-500 px-2 py-0.5 rounded">JD</button>
                    ${isAdmin ? `<button onclick="app.editEmployee(${emp.id})" class="text-[10px] text-white bg-blue-500 px-2 py-0.5 rounded">Edit</button>` : ''}
                </div>
            </div>`;
    },

    renderTree(staffList) {
        if (!staffList || staffList.length === 0) return '';
        let html = '<ul>';
        staffList.forEach(emp => {
            html += `<li>${this.createNode(emp)}`;
            html += this.renderTree(emp.children);
            html += '</li>';
        });
        html += '</ul>';
        return html;
    },

     renderChart() {
    const root = document.getElementById('org-tree-root');
    root.innerHTML = '';

    let topNodes = [];

    if (this.state.dept === 'All') {
        // ၁။ အားလုံးကြည့်မယ်ဆိုရင် Top Boss (manager_id: null) ကနေ စမယ်
        topNodes = this.data.filter(emp => emp.manager_id === null);
    } else {
        // ၂။ ဌာနတစ်ခုတည်းဆိုရင် အဲဒီဌာနထဲက Rank အမြင့်ဆုံးလူ (Dept Head) ကို ရှာမယ်
        const deptStaff = this.data.filter(e => e.dept === this.state.dept);
        
        if (deptStaff.length > 0) {
            // Rank အကြီးဆုံးဂဏန်းကို ရှာခြင်း
            const maxRank = Math.max(...deptStaff.map(s => s.rank || 0));
            // အဲဒီ Rank ရှိတဲ့လူကို Dept Head အဖြစ် သတ်မှတ်မယ်
            topNodes = deptStaff.filter(s => (s.rank || 0) === maxRank);
        }
    }

    if (topNodes.length === 0) {
        root.innerHTML = '<div class="p-10 text-slate-400">No Hierarchy Data Found</div>';
        return;
    }

    // Tree တည်ဆောက်ပြီး Render လုပ်မယ်
    let finalHtml = '';
    topNodes.forEach(head => {
        const branchData = {
            ...head,
            children: this.buildTree(head.id)
        };
        finalHtml += this.renderTree([branchData]);
    });

    root.innerHTML = finalHtml;
},

    // --- Modals & Actions ---
    updateManagerList(currentId = null, currentManagerId = null) {
        const select = document.getElementById('inp-manager');
        if(!select) return;
        select.innerHTML = '<option value="">None (Top Boss)</option>';
        
        this.data.forEach(emp => {
            const empRank = parseInt(emp.rank) || 0;
            
            // ၁။ ကိုယ်တိုင်ကို ပြန်မရွေးမိအောင် စစ်မယ် (emp.id != currentId)
            // ၂။ Rank 4 နဲ့ အထက်ဖြစ်ရမယ် (သို့မဟုတ်) သူဟာ လက်ရှိ Manager ဟောင်း ဖြစ်နေရမယ်
            if (emp.id != currentId && (empRank >= 4 || emp.id == currentManagerId)) {
                select.innerHTML += `<option value="${emp.id}">${emp.name} (${emp.position})</option>`;
            }
        });
    },
    openAddModal() {
        document.getElementById('emp-modal').classList.remove('hidden');
        document.getElementById('modal-title').innerText = "Add New Employee";
        document.querySelector('#emp-modal form').reset();
        document.getElementById('inp-id').value = ""; 
        this.updateManagerList(null, null);
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
        
        this.updateManagerList(emp.id,emp.manager_id);
        document.getElementById('inp-manager').value = emp.manager_id || "";
    },

    async saveEmployee(e) {
        e.preventDefault();
        this.toggleLoading(true);
        const idInput = document.getElementById('inp-id').value; 
        const empObj = {
            name: document.getElementById('inp-name').value,
            company: document.getElementById('inp-company').value,
            dept: document.getElementById('inp-dept').value,
            branch: document.getElementById('inp-branch').value,
            position: document.getElementById('inp-pos').value,
            rank: parseInt(document.getElementById('inp-rank').value) || 1,
            jd: document.getElementById('inp-jd').value,
            manager_id: parseInt(document.getElementById('inp-manager').value) || null
        };

        const success = idInput ? await db.update(idInput, empObj) : await db.add(empObj);
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
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    },

    closeModal(id) { 
        const modal = document.getElementById(id);
        modal.classList.add('hidden'); 
        modal.classList.remove('flex');
    }
};

// Start the Application
window.addEventListener('DOMContentLoaded', () => auth.init());







