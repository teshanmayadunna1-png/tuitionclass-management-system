// ==================== DATABASE INIT ====================
const db = new Dexie("TuitionManagementDB");

db.version(1).stores({
    users: '++id, name, email, password, role', // admin, teacher, student
    classes: '++id, name, subject, teacherId, fee, schedule',
    enrollments: '++id, studentId, classId, joinDate',
    attendance: '++id, classId, studentId, date, status', 
    marks: '++id, classId, studentId, examName, marks, maxMarks'
});

// ==================== APP STATE ====================
let currentUser = null;

// UI Elements
const screenLogin = document.getElementById('login-screen');
const screenApp = document.getElementById('app-screen');
const formLogin = document.getElementById('login-form');
const errLogin = document.getElementById('login-error');
const menuNav = document.getElementById('nav-menu');
const txtPageTitle = document.getElementById('page-title');
const txtPageSubtitle = document.getElementById('page-subtitle');
const mainContent = document.getElementById('content-area');

// ==================== INIT ====================
async function init() {
    await seedDemoData();
    
    // Auto login check
    const savedUserId = localStorage.getItem('edumanage_userid');
    if (savedUserId) {
        currentUser = await db.users.get(parseInt(savedUserId));
        if(currentUser) {
            setupAppEnvironment();
        } else {
            localStorage.removeItem('edumanage_userid');
        }
    }
}

async function seedDemoData() {
    const userCount = await db.users.count();
    if (userCount === 0) {
        await db.users.bulkAdd([
            { name: 'System Admin', email: 'admin@test.com', password: 'admin123', role: 'admin' },
            { name: 'Kamal Perera (Physics)', email: 'teacher@test.com', password: 'teacher123', role: 'teacher' },
            { name: 'Nimal Silva (Chemistry)', email: 'teacher2@test.com', password: 'teacher123', role: 'teacher' },
            { name: 'Kasun Kalhara', email: 'student@test.com', password: 'student123', role: 'student' },
            { name: 'Saman Kumara', email: 'student2@test.com', password: 'student123', role: 'student' }
        ]);

        await db.classes.bulkAdd([
            { name: 'A/L Physics 2025 Theory', subject: 'Physics', teacherId: 2, fee: 3500, schedule: 'Mon 02:00 PM - 05:00 PM' },
            { name: 'A/L Physics 2025 Revision', subject: 'Physics', teacherId: 2, fee: 2500, schedule: 'Wed 08:00 AM - 12:00 PM' },
            { name: 'A/L Chemistry 2025 Theory', subject: 'Chemistry', teacherId: 3, fee: 3000, schedule: 'Tue 01:00 PM - 04:30 PM' }
        ]);

        await db.enrollments.bulkAdd([
            { studentId: 4, classId: 1, joinDate: new Date().toISOString() },
            { studentId: 4, classId: 3, joinDate: new Date().toISOString() },
            { studentId: 5, classId: 1, joinDate: new Date().toISOString() }
        ]);
        console.log("Seeded Dexie dummy data!");
    }
}

// ==================== AUTHENTICATION ====================
formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    const btn = e.target.querySelector('button[type="submit"]');

    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Signing In...';
    btn.disabled = true;

    setTimeout(async () => {
        const user = await db.users.where('email').equals(email).first();

        if (user && user.password === pass) {
            currentUser = user;
            localStorage.setItem('edumanage_userid', user.id);
            errLogin.classList.add('hidden');
            setupAppEnvironment();
        } else {
            errLogin.classList.remove('hidden');
        }
        btn.innerHTML = 'Sign In';
        btn.disabled = false;
    }, 600); // UI delay for feeling
});

document.getElementById('logout-btn').addEventListener('click', () => {
    currentUser = null;
    localStorage.removeItem('edumanage_userid');
    formLogin.reset();
    screenApp.classList.add('hidden');
    screenLogin.classList.remove('hidden');
    // small anim
    screenLogin.style.opacity = 0;
    setTimeout(() => { screenLogin.style.opacity = 1; screenLogin.style.transition = 'opacity 0.4s'; }, 10);
});

// ==================== APP SETUP ====================
function setupAppEnvironment() {
    screenLogin.classList.add('hidden');
    screenApp.classList.remove('hidden');
    
    // Topbar Profile Setup
    document.getElementById('user-initial').textContent = currentUser.name.charAt(0).toUpperCase();

    // Sidebar Profile Setup
    document.getElementById('user-avatar-sidebar').textContent = currentUser.name.charAt(0).toUpperCase();
    document.getElementById('user-name-display').textContent = currentUser.name;
    document.getElementById('user-role-display').textContent = currentUser.role.toUpperCase();

    // Avatar Color logic based on role
    const sidebarAvatar = document.getElementById('user-avatar-sidebar');
    sidebarAvatar.className = 'w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md border-2 border-darkBg object-cover';
    
    if(currentUser.role==='admin') sidebarAvatar.classList.add('bg-gradient-to-br', 'from-indigo-500', 'to-purple-600');
    else if(currentUser.role==='teacher') sidebarAvatar.classList.add('bg-gradient-to-br', 'from-emerald-500', 'to-teal-600');
    else sidebarAvatar.classList.add('bg-gradient-to-br', 'from-orange-400', 'to-red-500');

    buildNavigation();
    loadDashboard();
}

const navConfig = {
    admin: [
        { id: 'dashboard', icon: 'fa-chart-pie', text: 'Overview', action: loadDashboard },
        { id: 'classes', icon: 'fa-chalkboard', text: 'Classes', action: loadAdminClasses },
        { id: 'teachers', icon: 'fa-chalkboard-teacher', text: 'Teachers', action: loadAdminTeachers },
        { id: 'students', icon: 'fa-user-graduate', text: 'Students', action: loadAdminStudents }
    ],
    teacher: [
        { id: 'dashboard', icon: 'fa-chart-pie', text: 'Overview', action: loadDashboard },
        { id: 'my_classes', icon: 'fa-chalkboard', text: 'My Classes', action: loadTeacherClasses },
        { id: 'attendance', icon: 'fa-clipboard-user', text: 'Attendance', action: loadTeacherAttendance }
    ],
    student: [
        { id: 'dashboard', icon: 'fa-chart-pie', text: 'Overview', action: loadDashboard },
        { id: 'my_classes', icon: 'fa-book-open', text: 'My Classes', action: loadStudentClasses }
    ]
};

function buildNavigation() {
    menuNav.innerHTML = '';
    const items = navConfig[currentUser.role];
    
    items.forEach(item => {
        const link = document.createElement('a');
        link.href = "#";
        link.className = `flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/50 nav-link`;
        link.dataset.id = item.id;
        
        // Internal structure
        link.innerHTML = `
            <div class="w-8 flex justify-center"><i class="fas ${item.icon} text-[18px]"></i></div>
            <span class="font-semibold tracking-wide text-sm">${item.text}</span>
        `;
        
        link.addEventListener('click', (e) => {
            e.preventDefault();
            // styling logic
            document.querySelectorAll('.nav-link').forEach(nav => {
                nav.classList.remove('active', 'text-white');
                nav.classList.add('text-slate-400');
            });
            link.classList.remove('text-slate-400');
            link.classList.add('active', 'text-white');
            
            txtPageTitle.textContent = item.text;
            item.action();
        });
        
        menuNav.appendChild(link);
    });

    // Default to first active
    if(menuNav.firstChild) {
        menuNav.firstChild.click();
    }
}

// ==================== DASHBOARD VIEW ====================

async function loadDashboard() {
    txtPageSubtitle.textContent = `Welcome back ${currentUser.name.split(' ')[0]}, here's what's happening.`;

    if (currentUser.role === 'admin') {
        const countStd = await db.users.where('role').equals('student').count();
        const countTch = await db.users.where('role').equals('teacher').count();
        const countCls = await db.classes.count();
        const countEnr = await db.enrollments.count();
        
        mainContent.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 fade-in stagger-1">
                ${buildStatCard('Total Students', countStd, 'fa-user-graduate', 'bg-blue-100 text-blue-600', '+12% from last month')}
                ${buildStatCard('Total Teachers', countTch, 'fa-chalkboard-teacher', 'bg-emerald-100 text-emerald-600', 'Active staff')}
                ${buildStatCard('Total Classes', countCls, 'fa-chalkboard', 'bg-purple-100 text-purple-600', 'Scheduled this week')}
                ${buildStatCard('Total Enrollments', countEnr, 'fa-file-signature', 'bg-orange-100 text-orange-600', 'Across all streams')}
            </div>
            
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 fade-in stagger-2">
                <div class="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                    <h3 class="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><i class="fas fa-bolt text-amber-400"></i> Quick Actions</h3>
                    <div class="grid grid-cols-2 gap-4">
                        <button onclick="document.querySelector('[data-id=students]').click()" class="p-4 rounded-xl border border-slate-200 hover:border-primary hover:bg-primary/5 text-left transition-all group">
                            <i class="fas fa-user-plus text-2xl text-slate-400 group-hover:text-primary mb-3 transition-colors"></i>
                            <h4 class="font-bold text-slate-700">Add Student</h4>
                            <p class="text-xs text-slate-500 mt-1">Register new admission</p>
                        </button>
                        <button onclick="document.querySelector('[data-id=classes]').click()" class="p-4 rounded-xl border border-slate-200 hover:border-primary hover:bg-primary/5 text-left transition-all group">
                            <i class="fas fa-layer-group text-2xl text-slate-400 group-hover:text-primary mb-3 transition-colors"></i>
                            <h4 class="font-bold text-slate-700">Create Class</h4>
                            <p class="text-xs text-slate-500 mt-1">Schedule new batch</p>
                        </button>
                    </div>
                </div>

                <div class="bg-gradient-to-br from-primary to-indigo-700 p-8 rounded-3xl shadow-lg relative overflow-hidden text-white">
                    <div class="absolute -right-4 -top-10 w-48 h-48 bg-white opacity-10 rounded-full blur-2xl"></div>
                    <h3 class="text-2xl font-bold mb-2 z-10 relative">System Status</h3>
                    <p class="text-indigo-100 font-medium mb-6 z-10 relative">All services are running smoothly</p>
                    
                    <div class="space-y-4 z-10 relative">
                        <div class="bg-white/10 p-4 rounded-xl border border-white/20 flex justify-between items-center backdrop-blur-sm">
                            <span class="font-medium"><i class="fas fa-database mr-2"></i> Local DB (Dexie.js)</span>
                            <span class="px-2.5 py-1 bg-green-500/20 text-green-300 text-xs font-bold rounded-full">Connected</span>
                        </div>
                        <div class="bg-white/10 p-4 rounded-xl border border-white/20 flex justify-between items-center backdrop-blur-sm">
                            <span class="font-medium"><i class="fas fa-wifi mr-2"></i> Offline Mode Ready</span>
                            <span class="px-2.5 py-1 bg-blue-500/20 text-blue-300 text-xs font-bold rounded-full">Active</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } 
    else if (currentUser.role === 'teacher') {
        const myClasses = await db.classes.where('teacherId').equals(currentUser.id).toArray();
        const classIds = myClasses.map(c => c.id);
        const enrCount = await db.enrollments.where('classId').anyOf(classIds).count();

        mainContent.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 fade-in stagger-1">
                ${buildStatCard('My Classes', myClasses.length, 'fa-chalkboard', 'bg-indigo-100 text-indigo-600', 'Scheduled classes')}
                ${buildStatCard('Enrolled Students', enrCount, 'fa-users', 'bg-teal-100 text-teal-600', 'Across your classes')}
            </div>
            
            <div class="mt-8 bg-white p-8 rounded-3xl shadow-sm border border-slate-200 fade-in stagger-2">
                <h3 class="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><i class="fas fa-calendar-alt text-primary"></i> Quick Tasks</h3>
                <button onclick="document.querySelector('[data-id=attendance]').click()" class="bg-primary hover:bg-primaryDark text-white px-6 py-3 rounded-xl font-semibold shadow-md transition-all flex items-center gap-3">
                    <i class="fas fa-clipboard-check"></i> Mark Today's Attendance
                </button>
            </div>
        `;
    } 
    else if (currentUser.role === 'student') {
        const enrollments = await db.enrollments.where('studentId').equals(currentUser.id).toArray();
        
        mainContent.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 fade-in stagger-1">
                ${buildStatCard('My Subscriptions', enrollments.length, 'fa-book-reader', 'bg-rose-100 text-rose-600', 'Active classes')}
            </div>
            
            <div class="mt-8 p-8 bg-gradient-to-r from-blue-500 to-primary rounded-3xl shadow-lg text-white fade-in stagger-2 relative overflow-hidden">
                <i class="fas fa-graduation-cap absolute -right-10 -bottom-10 text-[150px] opacity-10"></i>
                <h3 class="text-2xl font-bold mb-2">Welcome to your portal!</h3>
                <p class="text-blue-100 mb-6 max-w-md">Navigate to 'My Classes' to see your schedule or enroll in new classes.</p>
                <button onclick="document.querySelector('[data-id=my_classes]').click()" class="bg-white text-primary px-6 py-3 rounded-xl font-bold shadow-md hover:bg-slate-50 transition-all">
                    Go to My Classes <i class="fas fa-arrow-right ml-2 text-sm"></i>
                </button>
            </div>
        `;
    }
}

function buildStatCard(title, value, icon, colorClass, subtitle) {
    return `
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between card-hover">
            <div class="flex justify-between items-start mb-4">
                <div class="w-14 h-14 ${colorClass} rounded-2xl flex items-center justify-center text-2xl shadow-sm">
                    <i class="fas ${icon}"></i>
                </div>
            </div>
            <div>
                <h4 class="text-4xl font-extrabold text-slate-800 mb-1">${value}</h4>
                <p class="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">${title}</p>
                <p class="text-xs text-slate-400 font-medium">${subtitle}</p>
            </div>
        </div>
    `;
}

// ==================== ADMIN VIEWS ====================

async function loadAdminClasses() {
    txtPageSubtitle.textContent = "Manage schedules and courses";
    const classes = await db.classes.toArray();
    const teachers = await db.users.where('role').equals('teacher').toArray();
    
    // Build teachers map
    const tMap = {};
    teachers.forEach(t => tMap[t.id] = t.name);

    let html = `
        <div class="fade-in">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <h3 class="text-2xl font-bold text-slate-800 flex items-center gap-3">
                    <div class="p-2 bg-indigo-100 text-primary rounded-lg"><i class="fas fa-layer-group"></i></div> All Classes
                </h3>
                <button onclick="showModal('class-modal')" class="px-5 py-3 bg-primary hover:bg-primaryDark text-white font-bold rounded-xl shadow-lg hover:shadow-primary/30 transition-all flex items-center gap-2">
                    <i class="fas fa-plus"></i> Add New Class
                </button>
            </div>
            
            <div class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                            <tr class="bg-slate-50 border-b border-slate-200 text-slate-500">
                                <th class="py-4 px-6 font-bold uppercase tracking-wider text-xs">Class Title & Subject</th>
                                <th class="py-4 px-6 font-bold uppercase tracking-wider text-xs">Instructor</th>
                                <th class="py-4 px-6 font-bold uppercase tracking-wider text-xs">Fee (Rs)</th>
                                <th class="py-4 px-6 font-bold uppercase tracking-wider text-xs">Schedule</th>
                                <th class="py-4 px-6 font-bold uppercase tracking-wider text-xs text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${classes.length ? classes.map(c => `
                                <tr class="hover:bg-slate-50/80 transition-colors">
                                    <td class="py-4 px-6">
                                        <p class="font-bold text-slate-800 text-base mb-0.5">${c.name}</p>
                                        <p class="text-sm text-slate-500 font-medium">${c.subject}</p>
                                    </td>
                                    <td class="py-4 px-6 font-medium text-slate-700">
                                        <div class="flex items-center gap-2">
                                            <div class="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">
                                                <i class="fas fa-user-tie"></i>
                                            </div>
                                            ${tMap[c.teacherId] || 'Unassigned'}
                                        </div>
                                    </td>
                                    <td class="py-4 px-6 font-bold text-emerald-600">Rs. ${parseFloat(c.fee).toLocaleString()}</td>
                                    <td class="py-4 px-6 text-sm text-slate-600 font-medium"><i class="far fa-clock mr-1 text-slate-400"></i> ${c.schedule}</td>
                                    <td class="py-4 px-6 text-right">
                                        <button onclick="delClass(${c.id})" class="w-9 h-9 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors flex items-center justify-center ml-auto">
                                            <i class="fas fa-trash-alt"></i>
                                        </button>
                                    </td>
                                </tr>
                            `).join('') : `<tr><td colspan="5" class="py-12 px-6 text-center text-slate-400 font-medium"><div class="text-4xl mb-3"><i class="fas fa-box-open"></i></div>No classes recorded.</td></tr>`}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        
        <!-- Modal -->
        <div id="class-modal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4 opacity-0 transition-opacity duration-300">
            <div class="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden transform scale-95 transition-transform duration-300 init-modal">
                <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h2 class="text-xl font-extrabold text-slate-800">Create New Class</h2>
                    <button onclick="hideModal('class-modal')" class="text-slate-400 hover:text-red-500 text-xl"><i class="fas fa-times"></i></button>
                </div>
                <div class="p-6">
                    <form id="frm-add-class" class="space-y-5">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div class="md:col-span-2">
                                <label class="block text-sm font-bold text-slate-700 mb-2">Class Name</label>
                                <input required id="c-name" class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none text-sm font-medium" placeholder="E.g. A/L Physics Theory 2025">
                            </div>
                            <div>
                                <label class="block text-sm font-bold text-slate-700 mb-2">Subject</label>
                                <input required id="c-sub" class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none text-sm font-medium" placeholder="Physics">
                            </div>
                            <div>
                                <label class="block text-sm font-bold text-slate-700 mb-2">Monthly Fee (Rs)</label>
                                <input required type="number" id="c-fee" class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none text-sm font-bold text-emerald-600" placeholder="2500">
                            </div>
                            <div class="md:col-span-2">
                                <label class="block text-sm font-bold text-slate-700 mb-2">Assign Teacher</label>
                                <select required id="c-tea" class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none text-sm font-medium appearance-none">
                                    <option value="" disabled selected>-- Select an Instructor --</option>
                                    ${teachers.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="md:col-span-2">
                                <label class="block text-sm font-bold text-slate-700 mb-2">Schedule</label>
                                <input required id="c-sch" class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none text-sm font-medium" placeholder="E.g. Monday 02:00 PM - 05:00 PM">
                            </div>
                        </div>
                        
                        <div class="flex justify-end gap-3 mt-8 border-t border-slate-100 pt-5">
                            <button type="button" onclick="hideModal('class-modal')" class="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors">Cancel</button>
                            <button type="submit" class="px-6 py-3 bg-primary hover:bg-primaryDark text-white rounded-xl font-bold transition-colors flex items-center gap-2">
                                <i class="fas fa-check"></i> Save Class
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    mainContent.innerHTML = html;
    
    document.getElementById('frm-add-class')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await db.classes.add({
            name: document.getElementById('c-name').value,
            subject: document.getElementById('c-sub').value,
            teacherId: parseInt(document.getElementById('c-tea').value),
            fee: parseFloat(document.getElementById('c-fee').value),
            schedule: document.getElementById('c-sch').value
        });
        hideModal('class-modal');
        setTimeout(() => loadAdminClasses(), 300);
    });
}

window.delClass = async (id) => {
    if(confirm("Confirm deletion of this class? This cannot be undone.")) {
        await db.classes.delete(id);
        const enrs = await db.enrollments.where('classId').equals(id).toArray();
        for(let e of enrs) await db.enrollments.delete(e.id);
        const atts = await db.attendance.where('classId').equals(id).toArray();
        for(let a of atts) await db.attendance.delete(a.id);
        loadAdminClasses();
    }
}

async function loadAdminStudents() { renderUsersMng('student', 'Students', 'fa-user-graduate', 'blue'); }
async function loadAdminTeachers() { renderUsersMng('teacher', 'Teachers', 'fa-chalkboard-teacher', 'emerald'); }

async function renderUsersMng(role, title, icon, colorTheme) {
    txtPageSubtitle.textContent = `Manage registered ${title.toLowerCase()}`;
    const users = await db.users.where('role').equals(role).toArray();
    
    // Some tailwind dynamic class matching variables
    const bgHeader = `bg-${colorTheme}-100`;
    const textHeader = `text-${colorTheme}-600`;
    const bgAvatar = `bg-${colorTheme}-50`;
    const textAvatar = `text-${colorTheme}-600`;

    let html = `
        <div class="fade-in">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <h3 class="text-2xl font-bold text-slate-800 flex items-center gap-3">
                    <div class="p-2 ${bgHeader} ${textHeader} rounded-lg"><i class="fas ${icon}"></i></div> All ${title}
                </h3>
                <button onclick="showModal('user-modal')" class="px-5 py-3 bg-primary hover:bg-primaryDark text-white font-bold rounded-xl shadow-lg hover:shadow-primary/30 transition-all flex items-center gap-2">
                    <i class="fas fa-plus"></i> Add New ${title.slice(0, -1)}
                </button>
            </div>
            
            <div class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse min-w-[500px]">
                        <thead>
                            <tr class="bg-slate-50 border-b border-slate-200 text-slate-500">
                                <th class="py-4 px-6 font-bold uppercase tracking-wider text-xs w-16">Profile</th>
                                <th class="py-4 px-6 font-bold uppercase tracking-wider text-xs">Name</th>
                                <th class="py-4 px-6 font-bold uppercase tracking-wider text-xs">Email Address</th>
                                <th class="py-4 px-6 font-bold uppercase tracking-wider text-xs text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${users.length ? users.map(u => `
                                <tr class="hover:bg-slate-50/80 transition-colors group">
                                    <td class="py-3 px-6">
                                        <div class="w-10 h-10 rounded-full ${bgAvatar} ${textAvatar} flex items-center justify-center font-bold border border-${colorTheme}-100">
                                            ${u.name.charAt(0)}
                                        </div>
                                    </td>
                                    <td class="py-4 px-6 font-bold text-slate-800 text-base">${u.name}</td>
                                    <td class="py-4 px-6 font-medium text-slate-500"><i class="far fa-envelope text-slate-400 mr-2"></i>${u.email}</td>
                                    <td class="py-4 px-6 text-right">
                                        <button onclick="delUser(${u.id}, '${role}')" class="w-9 h-9 bg-red-50 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white rounded-lg transition-all flex items-center justify-center ml-auto">
                                            <i class="fas fa-trash-alt"></i>
                                        </button>
                                    </td>
                                </tr>
                            `).join('') : `<tr><td colspan="4" class="py-12 px-6 text-center text-slate-400 font-medium"><div class="text-4xl mb-3"><i class="fas fa-users-slash"></i></div>No ${title.toLowerCase()} found.</td></tr>`}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        
        <!-- Modal -->
        <div id="user-modal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4 opacity-0 transition-opacity duration-300">
            <div class="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform scale-95 transition-transform duration-300 init-modal">
                <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h2 class="text-xl font-extrabold text-slate-800 tracking-tight">Register ${title.slice(0, -1)}</h2>
                    <button onclick="hideModal('user-modal')" class="text-slate-400 hover:text-red-500 text-xl"><i class="fas fa-times"></i></button>
                </div>
                <div class="p-6">
                    <form id="frm-add-user" class="space-y-4">
                        <div>
                            <label class="block text-sm font-bold text-slate-700 mb-2">Full Name</label>
                            <input required id="u-name" class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none font-medium text-sm">
                        </div>
                        <div>
                            <label class="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
                            <input required type="email" id="u-mail" class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none font-medium text-sm">
                        </div>
                        <div>
                            <label class="block text-sm font-bold text-slate-700 mb-2">Assign Password</label>
                            <input required minlength="6" type="password" id="u-pass" class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none font-medium text-sm">
                            <p class="text-xs text-slate-400 mt-1">Minimum 6 characters required.</p>
                        </div>
                        
                        <div class="flex justify-end gap-3 mt-8 border-t border-slate-100 pt-5">
                            <button type="button" onclick="hideModal('user-modal')" class="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors">Cancel</button>
                            <button type="submit" class="px-6 py-3 bg-primary hover:bg-primaryDark text-white rounded-xl font-bold transition-colors flex items-center gap-2">
                                <i class="fas fa-check"></i> Register
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    mainContent.innerHTML = html;
    
    document.getElementById('frm-add-user')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await db.users.add({
            name: document.getElementById('u-name').value,
            email: document.getElementById('u-mail').value,
            password: document.getElementById('u-pass').value,
            role: role
        });
        hideModal('user-modal');
        setTimeout(() => renderUsersMng(role, title, icon, colorTheme), 300);
    });
}

window.delUser = async (id, role) => {
    if(confirm("Confirm account deletion?")) {
        await db.users.delete(id);
        if(role === 'student') {
            const enrs = await db.enrollments.where('studentId').equals(id).toArray();
            for(let e of enrs) await db.enrollments.delete(e.id);
        } else if(role === 'teacher') {
            const cls = await db.classes.where('teacherId').equals(id).toArray();
            // Just mark teacherId 0 or delete classes? For simple structure, keep classes but remove teacher.
            for(let c of cls) await db.classes.update(c.id, {teacherId: null});
        }
        
        let title = role === 'student' ? 'Students' : 'Teachers';
        let icon = role === 'student' ? 'fa-user-graduate' : 'fa-chalkboard-teacher';
        let col = role === 'student' ? 'blue' : 'emerald';
        renderUsersMng(role, title, icon, col);
    }
}

// ==================== TEACHER VIEWS ====================

async function loadTeacherClasses() {
    txtPageSubtitle.textContent = "Batches assigned to you";
    const clss = await db.classes.where('teacherId').equals(currentUser.id).toArray();
    
    let html = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 fade-in">
            ${clss.length ? clss.map(c => `
                <div class="bg-white rounded-3xl shadow-sm hover:shadow-xl border border-slate-200 overflow-hidden flex flex-col transition-all duration-300 transform hover:-translate-y-1">
                    <div class="p-8 flex-1">
                        <div class="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-2xl mb-6 shadow-sm border border-indigo-100">
                            <i class="fas fa-chalkboard"></i>
                        </div>
                        <h3 class="text-2xl font-extrabold text-slate-800 mb-2 leading-tight">${c.name}</h3>
                        <p class="text-sm font-bold text-indigo-600 uppercase tracking-wide mb-6">${c.subject}</p>
                        
                        <div class="space-y-3">
                            <div class="flex items-center gap-3 text-sm text-slate-600 font-medium">
                                <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400"><i class="far fa-clock"></i></div>
                                ${c.schedule}
                            </div>
                            <div class="flex items-center gap-3 text-sm font-bold text-slate-700">
                                <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-emerald-500"><i class="fas fa-coins text-xs"></i></div>
                                Rs. ${parseFloat(c.fee).toLocaleString()}
                            </div>
                        </div>
                    </div>
                    <div class="p-4 bg-slate-50 border-t border-slate-100">
                        <button onclick="viewClassStudents(${c.id}, '${c.name.replace(/'/g, "\\'")}')" class="w-full py-3 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 rounded-xl text-slate-700 font-bold transition-all shadow-sm flex justify-center items-center gap-2">
                            <i class="fas fa-users"></i> View Roster
                        </button>
                    </div>
                </div>
            `).join('') : `<div class="col-span-full py-16 text-center text-slate-400 font-medium bg-white rounded-3xl border border-slate-200"><div class="text-5xl mb-4"><i class="fas fa-folder-open"></i></div>No classes currently assigned.</div>`}
        </div>
    `;
    
    mainContent.innerHTML = html;
}

window.viewClassStudents = async (cId, cName) => {
    txtPageTitle.textContent = "Class Roster";
    txtPageSubtitle.textContent = `${cName} students list`;
    
    const enrs = await db.enrollments.where('classId').equals(cId).toArray();
    const sIds = enrs.map(e => e.studentId);
    
    let students = [];
    if(sIds.length) {
        students = await db.users.where('id').anyOf(sIds).toArray();
    }
    
    let html = `
        <div class="fade-in">
            <button onclick="loadTeacherClasses()" class="mb-6 py-2 px-4 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-primary hover:border-primary/30 font-bold text-sm flex items-center gap-2 transition-all shadow-sm">
                <i class="fas fa-arrow-left"></i> Back to Classes
            </button>
            <div class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div class="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 class="font-bold text-slate-800 text-lg">Enrolled Students (${students.length})</h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="border-b border-slate-100 text-slate-400">
                                <th class="py-3 px-6 font-bold uppercase tracking-wider text-xs">Student</th>
                                <th class="py-3 px-6 font-bold uppercase tracking-wider text-xs">Email</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                            ${students.length ? students.map(s => `
                                <tr class="hover:bg-slate-50 transition-colors">
                                    <td class="py-4 px-6 font-bold text-slate-700 flex items-center gap-4">
                                        <div class="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-lg font-bold shadow-sm border border-blue-100">${s.name.charAt(0)}</div>
                                        ${s.name}
                                    </td>
                                    <td class="py-4 px-6 text-slate-500 font-medium">${s.email}</td>
                                </tr>
                            `).join('') : `<tr><td colspan="2" class="py-10 text-center text-slate-400 font-medium">No students enrolled yet.</td></tr>`}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    mainContent.innerHTML = html;
}

async function loadTeacherAttendance() {
    txtPageSubtitle.textContent = "Track class attendance records";
    const clss = await db.classes.where('teacherId').equals(currentUser.id).toArray();
    
    let html = `
        <div class="fade-in">
            <!-- Filter box -->
            <div class="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 mb-8 max-w-2xl">
                <h3 class="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><i class="fas fa-calendar-check text-primary"></i> Record Attendance</h3>
                <div class="flex flex-col sm:flex-row gap-4">
                    <div class="flex-1">
                        <label class="block text-sm font-bold text-slate-700 mb-2">Select Class</label>
                        <select id="att-c" class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none text-sm font-medium appearance-none bg-slate-50 relative">
                            <option value="">-- Choose Class --</option>
                            ${clss.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="flex-1">
                        <label class="block text-sm font-bold text-slate-700 mb-2">Date</label>
                        <input type="date" id="att-d" class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none text-sm font-medium bg-slate-50" value="${new Date().toISOString().split('T')[0]}">
                    </div>
                </div>
                <button onclick="fetchAtt()" class="mt-6 w-full py-4 bg-primary hover:bg-primaryDark text-white font-bold rounded-xl shadow-md transition-all">
                    Load Students
                </button>
            </div>
            
            <div id="att-list" class="transition-all"></div>
        </div>
    `;
    
    mainContent.innerHTML = html;
}

window.fetchAtt = async () => {
    const cId = document.getElementById('att-c').value;
    const date = document.getElementById('att-d').value;
    const resDiv = document.getElementById('att-list');
    
    if(!cId || !date) { alert('Select class and date'); return; }
    
    resDiv.innerHTML = '<div class="py-10 text-center"><i class="fas fa-spinner fa-spin text-3xl text-primary"></i></div>';
    
    const enrs = await db.enrollments.where('classId').equals(parseInt(cId)).toArray();
    const sIds = enrs.map(e => e.studentId);
    
    if(!sIds.length) {
        resDiv.innerHTML = '<div class="bg-white p-8 rounded-3xl border border-slate-200 text-center text-slate-500 font-medium shadow-sm">No students in this class.</div>';
        return;
    }
    
    const stds = await db.users.where('id').anyOf(sIds).toArray();
    const attRecs = await db.attendance.where({classId: parseInt(cId), date: date}).toArray();
    const aMap = {};
    attRecs.forEach(a => aMap[a.studentId] = a.status);
    
    let html = `
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden fade-in">
            <div class="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <div>
                    <h3 class="font-bold text-slate-800 text-lg">Attendance Sheet</h3>
                    <p class="text-sm text-slate-500 font-medium">Date: ${date}</p>
                </div>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left">
                    <thead>
                        <tr class="bg-white text-slate-400 border-b border-slate-100">
                            <th class="py-4 px-6 font-bold uppercase tracking-wider text-xs">Student Name</th>
                            <th class="py-4 px-6 font-bold uppercase tracking-wider text-xs w-64 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-50">
                        ${stds.map(s => {
                            const st = aMap[s.id] || 'present';
                            const btnGreen = st === 'present' ? 'bg-emerald-500 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200';
                            const btnRed = st === 'absent' ? 'bg-red-500 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200';
                            
                            return `
                            <tr class="hover:bg-slate-50 transition-colors">
                                <td class="py-4 px-6 font-bold text-slate-700">${s.name}</td>
                                <td class="py-4 px-6">
                                    <div class="flex gap-2 justify-center bg-slate-50 p-1.5 rounded-xl border border-slate-100 inline-flex w-full">
                                        <button id="pbtn-${s.id}" onclick="markAtt(${cId}, ${s.id}, '${date}', 'present')" class="flex-1 py-2 px-4 rounded-lg font-bold text-sm transition-all ${btnGreen}">
                                            Present
                                        </button>
                                        <button id="abtn-${s.id}" onclick="markAtt(${cId}, ${s.id}, '${date}', 'absent')" class="flex-1 py-2 px-4 rounded-lg font-bold text-sm transition-all ${btnRed}">
                                            Absent
                                        </button>
                                    </div>
                                </td>
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    setTimeout(() => { resDiv.innerHTML = html; }, 300); // UI smoother

    for(let s of stds) {
        if(!aMap[s.id]) {
            await db.attendance.add({classId: parseInt(cId), studentId: s.id, date: date, status: 'present'});
        }
    }
}

window.markAtt = async (cId, sId, date, status) => {
    const rec = await db.attendance.where({classId: parseInt(cId), date: date}).and(x => x.studentId === sId).first();
    if(rec) await db.attendance.update(rec.id, {status});
    else await db.attendance.add({classId: parseInt(cId), studentId: sId, date: date, status});
    
    // UI update
    const pbtn = document.getElementById(`pbtn-${sId}`);
    const abtn = document.getElementById(`abtn-${sId}`);
    
    if(status === 'present') {
        pbtn.className = "flex-1 py-2 px-4 rounded-lg font-bold text-sm transition-all bg-emerald-500 text-white shadow-md";
        abtn.className = "flex-1 py-2 px-4 rounded-lg font-bold text-sm transition-all bg-slate-100 text-slate-500 hover:bg-slate-200";
    } else {
        abtn.className = "flex-1 py-2 px-4 rounded-lg font-bold text-sm transition-all bg-red-500 text-white shadow-md";
        pbtn.className = "flex-1 py-2 px-4 rounded-lg font-bold text-sm transition-all bg-slate-100 text-slate-500 hover:bg-slate-200";
    }
}

// ==================== STUDENT VIEWS ====================

async function loadStudentClasses() {
    txtPageSubtitle.textContent = "Explore and manage your enrollments";
    const enrs = await db.enrollments.where('studentId').equals(currentUser.id).toArray();
    const cIds = enrs.map(e => e.classId);
    
    let myCs = [];
    if(cIds.length) myCs = await db.classes.where('id').anyOf(cIds).toArray();
    
    const tMap = {};
    const tchrs = await db.users.where('role').equals('teacher').toArray();
    tchrs.forEach(t => tMap[t.id] = t.name);
    
    const allC = await db.classes.toArray();
    const availC = allC.filter(c => !cIds.includes(c.id));
    
    let html = `
        <div class="fade-in space-y-12">
            <!-- Subscribed -->
            <section>
                <div class="flex items-center gap-3 mb-6">
                    <div class="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg"><i class="fas fa-bookmark"></i></div>
                    <h3 class="text-2xl font-extrabold text-slate-800 tracking-tight">Current Subscriptions</h3>
                </div>
                
                <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    ${myCs.length ? myCs.map(c => `
                        <div class="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-slate-900/10 card-hover group">
                            <!-- decoration -->
                            <div class="absolute -right-10 -top-10 w-40 h-40 bg-gradient-to-br from-primary to-purple-500 opacity-20 rounded-full blur-2xl group-hover:opacity-40 transition-opacity"></div>
                            <div class="absolute right-6 top-6 text-slate-700/50 text-6xl opacity-20"><i class="fas fa-graduation-cap"></i></div>
                            
                            <span class="px-3 py-1 bg-white/10 text-white text-[10px] font-extrabold uppercase tracking-widest rounded-full border border-white/10 backdrop-blur-md mb-4 inline-block">Enrolled</span>
                            
                            <h4 class="text-2xl font-extrabold mb-1 relative z-10 leading-tight">${c.name}</h4>
                            <p class="text-slate-400 font-medium text-sm mb-6 relative z-10 flex items-center gap-2"><i class="fas fa-user-tie text-xs"></i> ${tMap[c.teacherId] || 'TBA'}</p>
                            
                            <div class="mt-auto bg-black/30 rounded-2xl p-4 border border-white/5 backdrop-blur-md relative z-10">
                                <div class="flex items-center gap-3 text-sm font-medium text-slate-300">
                                    <i class="far fa-clock text-primary w-4"></i>
                                    <span>${c.schedule}</span>
                                </div>
                            </div>
                        </div>
                    `).join('') : `
                        <div class="col-span-full py-16 bg-white rounded-3xl border border-slate-200 text-center border-dashed">
                            <div class="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center text-4xl mx-auto mb-4"><i class="fas fa-book-open"></i></div>
                            <h4 class="text-xl font-bold text-slate-700 mb-2">No active classes yet</h4>
                            <p class="text-slate-500 font-medium">Browse available classes below and enroll now!</p>
                        </div>
                    `}
                </div>
            </section>
            
            <!-- Available to enroll -->
            <section>
                <div class="flex items-center gap-3 mb-6">
                    <div class="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-lg"><i class="fas fa-compass"></i></div>
                    <h3 class="text-2xl font-extrabold text-slate-800 tracking-tight">Available New Classes</h3>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${availC.length ? availC.map(c => `
                        <div class="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 card-hover flex flex-col items-start relative z-0">
                            <div class="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100 text-xl mb-4 shadow-sm"><i class="fas fa-chalkboard"></i></div>
                            <h4 class="text-lg font-extrabold text-slate-800 leading-tight mb-1">${c.name}</h4>
                            <p class="text-sm text-slate-500 font-medium mb-4 flex items-center gap-2"><i class="fas fa-user-tie text-xs text-slate-400"></i> ${tMap[c.teacherId] || 'TBA'}</p>
                            
                            <div class="w-full space-y-2 mb-6 text-sm text-slate-600 font-medium bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <p class="flex items-center gap-3"><i class="far fa-clock text-slate-400 w-4"></i> ${c.schedule}</p>
                                <p class="flex items-center gap-3"><i class="fas fa-tag text-emerald-500 w-4 text-xs"></i> <span class="text-emerald-600 font-bold">Rs. ${parseFloat(c.fee).toLocaleString()} /mo</span></p>
                            </div>
                            
                            <button onclick="enrClass(${c.id})" class="mt-auto w-full py-4 bg-slate-100 hover:bg-primary text-slate-700 hover:text-white font-extrabold rounded-xl transition-all border border-slate-200 hover:border-transparent group overflow-hidden relative">
                                <span class="relative z-10 flex items-center justify-center gap-2">Enroll Now <i class="fas fa-arrow-right text-xs opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all"></i></span>
                            </button>
                        </div>
                    `).join('') : `
                        <div class="col-span-full py-10 text-center text-slate-400 font-medium bg-white rounded-3xl border border-slate-200">
                            No classes currently available for enrollment.
                        </div>
                    `}
                </div>
            </section>
        </div>
    `;
    
    mainContent.innerHTML = html;
}

window.enrClass = async (cId) => {
    if(confirm("Join this class now?")) {
        await db.enrollments.add({ classId: cId, studentId: currentUser.id, joinDate: new Date().toISOString() });
        // show a quick toast or anim, simple reload
        loadStudentClasses();
    }
}

// ==================== UTILS ====================

// helpers for Modals
function showModal(id) {
    const m = document.getElementById(id);
    const content = m.querySelector('.init-modal');
    m.classList.remove('hidden');
    // small reflow
    void m.offsetWidth;
    m.classList.remove('opacity-0');
    content.classList.remove('scale-95');
    content.classList.add('scale-100');
}

function hideModal(id) {
    const m = document.getElementById(id);
    const content = m.querySelector('.init-modal');
    m.classList.add('opacity-0');
    content.classList.remove('scale-100');
    content.classList.add('scale-95');
    setTimeout(() => { m.classList.add('hidden'); }, 300);
}

// Start sequence
document.addEventListener('DOMContentLoaded', init);
