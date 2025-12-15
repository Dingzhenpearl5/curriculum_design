/**
 * 教学管理员端逻辑 (IndexedDB 版)
 */

// 全局变量存储当前数据
let currentClasses = [];
let currentCourses = [];
let currentPlans = [];
let currentUsers = [];
let currentScores = [];

// 排序状态
let sortState = {
    tableId: null,
    field: null,
    direction: 'asc' // 'asc' or 'desc'
};

// Bootstrap Modal 实例
let classModal, courseModal, planModal, scoreDetailModal, studentModal, teacherModal, classStudentsModal;

document.addEventListener('DOMContentLoaded', () => {
    // 初始化 Modals
    classModal = new bootstrap.Modal(document.getElementById('classModal'));
    courseModal = new bootstrap.Modal(document.getElementById('courseModal'));
    planModal = new bootstrap.Modal(document.getElementById('planModal'));
    scoreDetailModal = new bootstrap.Modal(document.getElementById('scoreDetailModal'));
    studentModal = new bootstrap.Modal(document.getElementById('studentModal'));
    teacherModal = new bootstrap.Modal(document.getElementById('teacherModal'));
    classStudentsModal = new bootstrap.Modal(document.getElementById('classStudentsModal'));

    // 绑定导航事件 (Navbar & Dashboard Cards)
    const handleNavigation = (targetId) => {
        if (!targetId) return;

        // 1. 切换内容区域
        document.querySelectorAll('.content-section').forEach(section => {
            section.style.display = 'none';
        });
        
        const targetSection = document.getElementById(targetId);
        if (targetSection) {
            targetSection.style.display = 'block';
        }

        // 2. 更新 Navbar 激活状态
        document.querySelectorAll('.navbar-nav .nav-link').forEach(l => l.classList.remove('active'));
        
        // 尝试找到对应的 nav-link
        const activeLink = document.querySelector(`.navbar-nav .nav-link[data-target="${targetId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
            // 如果在下拉菜单中，也激活父级
            const parentDropdown = activeLink.closest('.dropdown');
            if (parentDropdown) {
                parentDropdown.querySelector('.dropdown-toggle').classList.add('active');
            }
        }

        // 3. 重新加载数据
        loadAllData();
    };

    // 绑定 Navbar 链接 (包括下拉菜单项) 和 返回按钮
    document.querySelectorAll('.navbar-nav .nav-link, .navbar-brand, .dropdown-item, button[data-target]').forEach(link => {
        link.addEventListener('click', (e) => {
            const targetLink = e.currentTarget;
            if (targetLink.classList.contains('disabled')) return;
            if (targetLink.hasAttribute('data-bs-toggle')) return; // 忽略下拉菜单开关

            e.preventDefault();
            const targetId = targetLink.getAttribute('data-target');
            handleNavigation(targetId);
        });
    });

    // 绑定仪表盘卡片
    document.querySelectorAll('.dashboard-card').forEach(card => {
        card.addEventListener('click', (e) => {
            const targetId = e.currentTarget.getAttribute('data-target');
            handleNavigation(targetId);
        });
    });

    // 初始加载
    loadAllData();
});

/**
 * 处理表格排序
 * @param {string} tableId 表格ID
 * @param {string} field 排序字段
 */
function handleSort(tableId, field) {
    if (sortState.tableId === tableId && sortState.field === field) {
        // 切换排序方向
        sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
    } else {
        // 新的排序字段
        sortState.tableId = tableId;
        sortState.field = field;
        sortState.direction = 'asc';
    }

    // 根据表格ID重新渲染
    if (tableId === 'class-table') {
        renderClasses();
    } else if (tableId === 'student-table') {
        renderStudents();
    } else if (tableId === 'score-audit-table') {
        renderScoreAudit();
    }
}

/**
 * 导出所有成绩
 */
function exportAllScores() {
    // 简单的 CSV 导出实现
    const headers = ['课程', '教师', '学生学号', '学生姓名', '平时成绩', '期中成绩', '期末成绩', '总评成绩'];
    const rows = [];

    currentScores.forEach(score => {
        const plan = currentPlans.find(p => p.id === score.coursePlanId);
        const courseName = plan ? getCourseName(plan.courseId) : '未知课程';
        const teacherName = plan ? getUserName(plan.teacherId) : '未知教师';
        const studentName = getUserName(score.studentId);
        const studentNo = getUserName(score.studentId, 'username');

        rows.push([
            courseName,
            teacherName,
            studentNo,
            studentName,
            score.quiz || 0,
            score.midterm || 0,
            score.final || 0,
            score.total || 0
        ]);
    });

    // 按学号排序 (index 2)
    rows.sort((a, b) => {
        const idA = a[2] || '';
        const idB = b[2] || '';
        return idA.localeCompare(idB);
    });

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // 添加 BOM 防止乱码
    csvContent += headers.join(",") + "\r\n";
    rows.forEach(row => {
        csvContent += row.join(",") + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "all_scores_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * 退出登录
 */
function logout() {
    if (confirm('确定要退出登录吗？')) {
        // 清除 session 或 token (如果有)
        // 这里简单跳转回登录页
        window.location.href = 'index.html';
    }
}

/**
 * 加载所有数据并渲染当前视图
 */
async function loadAllData() {
    try {
        currentClasses = await db.getAll(STORAGE_KEYS.CLASSES) || [];
        currentCourses = await db.getAll(STORAGE_KEYS.COURSES) || [];
        currentPlans = await db.getAll(STORAGE_KEYS.COURSE_PLANS) || [];
        currentUsers = await db.getAll(STORAGE_KEYS.USERS) || [];
        currentScores = await db.getAll(STORAGE_KEYS.SCORES) || [];

        renderClasses();
        renderCourses();
        renderPlans();
        renderSchedule();
        renderScoreAudit();
        renderStudents();
        renderTeachers();
    } catch (e) {
        console.error("Failed to load data from IndexedDB", e);
    }
}

// ==========================================
// 班级管理
// ==========================================

function renderClasses() {
    const tbody = document.querySelector('#class-table tbody');
    if (!tbody) return;

    let displayData = [...currentClasses];

    // 处理排序
    if (sortState.tableId === 'class-table' && sortState.field) {
        displayData.sort((a, b) => {
            let valA = a[sortState.field];
            let valB = b[sortState.field];

            // 简单的字符串/数字比较
            if (valA < valB) return sortState.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortState.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    tbody.innerHTML = displayData.map(cls => {
        const studentCount = currentUsers.filter(u => u.role === 'student' && u.classId === cls.id).length;
        return `
        <tr>
            <td>${cls.id}</td>
            <td>
                <a href="#" onclick="event.preventDefault(); viewClassStudents('${cls.id}')" class="text-decoration-none fw-bold" title="点击查看班级学生">
                    ${cls.name}
                </a>
            </td>
            <td><span class="badge bg-info text-dark">${studentCount} 人</span></td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="openClassModal('${cls.id}')">编辑</button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteClass('${cls.id}')">删除</button>
            </td>
        </tr>
    `}).join('');
}

function openClassModal(id = null) {
    const form = document.getElementById('classForm');
    form.reset();
    document.getElementById('classId').value = '';
    
    if (id) {
        const cls = currentClasses.find(c => c.id === id);
        if (cls) {
            document.getElementById('classId').value = cls.id;
            form.elements['name'].value = cls.name;
            document.getElementById('classModalLabel').textContent = '编辑班级';
        }
    } else {
        document.getElementById('classModalLabel').textContent = '新增班级';
    }
    classModal.show();
}

async function saveClass() {
    const form = document.getElementById('classForm');
    const id = document.getElementById('classId').value;
    const name = form.elements['name'].value;

    if (!name) return alert('请输入班级名称');

    const cls = {
        id: id || generateId('cls_'),
        name: name
    };

    await db.put(STORAGE_KEYS.CLASSES, cls);
    classModal.hide();
    loadAllData();
}

async function deleteClass(id) {
    if (confirm('确定删除该班级吗？')) {
        await db.delete(STORAGE_KEYS.CLASSES, id);
        loadAllData();
    }
}

function viewClassStudents(classId) {
    const cls = currentClasses.find(c => c.id === classId);
    if (!cls) return;

    const students = currentUsers.filter(u => u.role === 'student' && u.classId === classId);
    
    document.getElementById('classStudentsModalLabel').textContent = `${cls.name} - 学生列表 (${students.length}人)`;
    
    const tbody = document.querySelector('#class-students-table tbody');
    if (students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-3 text-muted">该班级暂无学生</td></tr>';
    } else {
        tbody.innerHTML = students.map(s => `
            <tr>
                <td>${s.username}</td>
                <td>${s.name}</td>
                <td>${getGenderLabel(s.gender)}</td>
                <td>${getRegionLabel(s.region)}</td>
                <td>${s.phone || '-'}</td>
            </tr>
        `).join('');
    }
    
    classStudentsModal.show();
}

// ==========================================
// 学生管理
// ==========================================

function handleStudentSearch() {
    const input = document.getElementById('studentSearch');
    if (!input.value.trim()) {
        input.classList.add('is-invalid');
        return;
    }
    input.classList.remove('is-invalid');
    renderStudents();
}

function renderStudents() {
    const tbody = document.querySelector('#student-table tbody');
    if (!tbody) return;
    const students = currentUsers.filter(u => u.role === 'student');
    
    // 简单的搜索过滤
    const searchInput = document.getElementById('studentSearch');
    // 只有当输入框没有 invalid 状态时才进行过滤，或者如果为空但没有触发搜索（初始加载）则不过滤
    // 但为了简单起见，我们直接读取值。如果用户清空了输入框并点击搜索，会显示 invalid，不会走到这里（如果通过按钮触发）。
    // 但 renderStudents 也会被 loadAllData 调用。
    // 策略：如果输入框为空，则显示所有。
    const search = searchInput?.value.trim().toLowerCase() || '';
    
    let filtered = students.filter(s => s.name.toLowerCase().includes(search) || s.username.toLowerCase().includes(search));

    // 处理排序
    if (sortState.tableId === 'student-table' && sortState.field) {
        filtered.sort((a, b) => {
            let valA, valB;

            if (sortState.field === 'className') {
                valA = getClassName(a.classId);
                valB = getClassName(b.classId);
            } else {
                valA = a[sortState.field];
                valB = b[sortState.field];
            }

            if (valA < valB) return sortState.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortState.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    tbody.innerHTML = filtered.map(stu => `
        <tr>
            <td>
                <img src="${stu.avatar || DEFAULT_AVATAR}" class="rounded-circle border" width="32" height="32" style="object-fit: cover;">
            </td>
            <td>${stu.username}</td>
            <td>${stu.name}</td>
            <td>${getGenderLabel(stu.gender)}</td>
            <td>${getClassName(stu.classId)}</td>
            <td>${stu.phone || '-'}</td>
            <td>${getRegionLabel(stu.region)}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="openStudentModal('${stu.id}')">编辑</button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteUser('${stu.id}')">删除</button>
            </td>
        </tr>
    `).join('');
}

function openStudentModal(id = null) {
    if (id) {
        // 编辑模式：切换到新的个人中心风格页面
        switchToStudentEdit(id);
        return;
    }

    // 新增模式：继续使用 Modal
    const form = document.getElementById('studentForm');
    form.reset();
    document.getElementById('studentId').value = '';
    
    // 填充班级下拉框
    const classSelect = form.elements['classId'];
    classSelect.innerHTML = currentClasses.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    document.getElementById('studentModalLabel').textContent = '新增学生';
    studentModal.show();
}

function switchToStudentEdit(id) {
    const stu = currentUsers.find(u => u.id === id);
    if (!stu) return;

    // 1. 隐藏所有 section，显示编辑 section
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
    document.getElementById('student-edit-section').style.display = 'block';

    // 2. 填充数据
    document.getElementById('editStudentId').value = stu.id;
    document.getElementById('editStudentUsername').value = stu.username; // 昵称/学号
    document.getElementById('editStudentName').value = stu.name;
    
    // 填充班级下拉框
    const classSelect = document.getElementById('editStudentClassId');
    classSelect.innerHTML = currentClasses.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    classSelect.value = stu.classId;

    // 性别 (假设数据中有 gender 字段，如果没有默认为 male)
    const gender = stu.gender || 'male';
    const genderRadio = document.querySelector(`input[name="gender"][value="${gender}"]`);
    if (genderRadio) genderRadio.checked = true;

    // 邮箱 (显示)
    const emailDisplay = document.getElementById('editStudentEmail');
    if (emailDisplay) emailDisplay.textContent = stu.email || '未绑定邮箱';

    // 手机 (显示)
    const phoneDisplay = document.getElementById('editStudentPhone');
    if (phoneDisplay) phoneDisplay.textContent = stu.phone || '未绑定手机';

    // 生日
    const birthdayInput = document.querySelector('#student-edit-section input[type="date"]');
    if (birthdayInput) birthdayInput.value = stu.birthday || '';

    // 地区
    const regionSelect = document.querySelector('#student-edit-section select:not(#editStudentClassId)');
    if (regionSelect) regionSelect.value = stu.region || '';
    
    // 头像
    const avatarImg = document.getElementById('editStudentAvatar');
    // 如果没有头像，使用默认的 SVG
    avatarImg.src = stu.avatar || DEFAULT_AVATAR;

    // 确保内联编辑框是隐藏的
    document.getElementById('emailEditRow').style.display = 'none';
    document.getElementById('phoneEditRow').style.display = 'none';
}

// --- 头像处理逻辑 ---
function triggerAvatarUpload() {
    document.getElementById('avatarInput').click();
}

function handleAvatarChange(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        
        // 限制大小 (例如 2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert('图片大小不能超过 2MB');
            input.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('editStudentAvatar').src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

// --- 邮箱编辑逻辑 ---
function toggleEmailEdit() {
    const row = document.getElementById('emailEditRow');
    const input = document.getElementById('emailInput');
    const current = document.getElementById('editStudentEmail').textContent;
    
    if (row.style.display === 'none') {
        row.style.display = 'block';
        input.value = current === '未绑定邮箱' ? '' : current;
        input.focus();
    } else {
        row.style.display = 'none';
    }
}

function confirmEmailEdit() {
    const newVal = document.getElementById('emailInput').value.trim();
    document.getElementById('editStudentEmail').textContent = newVal || '未绑定邮箱';
    document.getElementById('emailEditRow').style.display = 'none';
}

function cancelEmailEdit() {
    document.getElementById('emailEditRow').style.display = 'none';
}

// --- 手机编辑逻辑 ---
function togglePhoneEdit() {
    const row = document.getElementById('phoneEditRow');
    const input = document.getElementById('phoneInput');
    const current = document.getElementById('editStudentPhone').textContent;
    
    if (row.style.display === 'none') {
        row.style.display = 'block';
        input.value = current === '未绑定手机' ? '' : current;
        input.focus();
    } else {
        row.style.display = 'none';
    }
}

function confirmPhoneEdit() {
    const newVal = document.getElementById('phoneInput').value.trim();
    document.getElementById('editStudentPhone').textContent = newVal || '未绑定手机';
    document.getElementById('phoneEditRow').style.display = 'none';
}

function cancelPhoneEdit() {
    document.getElementById('phoneEditRow').style.display = 'none';
}

function unbindPhone() {
    if(confirm('确定要解除手机绑定吗？')) {
        document.getElementById('editStudentPhone').textContent = '未绑定手机';
    }
}

function cancelEdit() {
    // 返回学生列表
    document.getElementById('student-edit-section').style.display = 'none';
    document.getElementById('student-section').style.display = 'block';
    // 隐藏所有内联编辑框
    document.getElementById('emailEditRow').style.display = 'none';
    document.getElementById('phoneEditRow').style.display = 'none';
}

async function saveStudentProfile() {
    const id = document.getElementById('editStudentId').value;
    const username = document.getElementById('editStudentUsername').value;
    const classId = document.getElementById('editStudentClassId').value;
    const gender = document.querySelector('input[name="gender"]:checked').value;
    
    // 获取新增字段
    const birthday = document.querySelector('#student-edit-section input[type="date"]').value;
    const region = document.querySelector('#student-edit-section select:not(#editStudentClassId)').value;
    const avatar = document.getElementById('editStudentAvatar').src;
    
    // 获取邮箱和手机 (从 span 中读取)
    const emailText = document.getElementById('editStudentEmail').textContent;
    const phoneText = document.getElementById('editStudentPhone').textContent;
    const email = emailText === '未绑定邮箱' ? '' : emailText;
    const phone = phoneText === '未绑定手机' ? '' : phoneText;

    if (!username) return alert('请输入昵称/学号');

    // 查找原用户对象以保留其他字段
    const originalUser = currentUsers.find(u => u.id === id);
    if (!originalUser) return;

    const updatedUser = {
        ...originalUser,
        username: username,
        classId: classId,
        gender: gender,
        birthday: birthday,
        region: region,
        email: email,
        phone: phone,
        avatar: avatar
    };

    await db.put(STORAGE_KEYS.USERS, updatedUser);
    alert('保存成功');
    cancelEdit(); // 返回列表
    loadAllData(); // 刷新数据
}

async function saveStudent() {
    const form = document.getElementById('studentForm');
    const id = document.getElementById('studentId').value;
    
    const student = {
        id: id || generateId('stu_'),
        username: form.elements['username'].value,
        name: form.elements['name'].value,
        classId: form.elements['classId'].value,
        role: 'student',
        password: '123' // 默认密码
    };

    await db.put(STORAGE_KEYS.USERS, student);
    studentModal.hide();
    loadAllData();
}

// ==========================================
// 教师管理
// ==========================================

function renderTeachers() {
    const tbody = document.querySelector('#teacher-table tbody');
    if (!tbody) return;
    const teachers = currentUsers.filter(u => u.role === 'teacher');
    
    tbody.innerHTML = teachers.map(t => `
        <tr>
            <td>${t.username}</td>
            <td>${t.name}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="openTeacherModal('${t.id}')">编辑</button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteUser('${t.id}')">删除</button>
            </td>
        </tr>
    `).join('');
}

function openTeacherModal(id = null) {
    const form = document.getElementById('teacherForm');
    form.reset();
    document.getElementById('teacherId').value = '';
    
    if (id) {
        const t = currentUsers.find(u => u.id === id);
        if (t) {
            document.getElementById('teacherId').value = t.id;
            form.elements['username'].value = t.username;
            form.elements['name'].value = t.name;
            document.getElementById('teacherModalLabel').textContent = '编辑教师';
        }
    } else {
        document.getElementById('teacherModalLabel').textContent = '新增教师';
    }
    teacherModal.show();
}

async function saveTeacher() {
    const form = document.getElementById('teacherForm');
    const id = document.getElementById('teacherId').value;
    
    const teacher = {
        id: id || generateId('tea_'),
        username: form.elements['username'].value,
        name: form.elements['name'].value,
        role: 'teacher',
        password: '123'
    };

    await db.put(STORAGE_KEYS.USERS, teacher);
    teacherModal.hide();
    loadAllData();
}

async function deleteUser(id) {
    if (confirm('确定删除该用户吗？')) {
        await db.delete(STORAGE_KEYS.USERS, id);
        loadAllData();
    }
}

// ==========================================
// 课程管理
// ==========================================

function renderCourses() {
    const tbody = document.querySelector('#course-table tbody');
    if (!tbody) return;
    tbody.innerHTML = currentCourses.map(c => `
        <tr>
            <td>${c.code}</td>
            <td>${c.name}</td>
            <td>${c.credits}</td>
            <td>${c.department}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="openCourseModal('${c.id}')">编辑</button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteCourse('${c.id}')">删除</button>
            </td>
        </tr>
    `).join('');
}

function openCourseModal(id = null) {
    const form = document.getElementById('courseForm');
    form.reset();
    document.getElementById('courseId').value = '';
    
    if (id) {
        const c = currentCourses.find(x => x.id === id);
        if (c) {
            document.getElementById('courseId').value = c.id;
            form.elements['code'].value = c.code;
            form.elements['name'].value = c.name;
            form.elements['credits'].value = c.credits;
            form.elements['department'].value = c.department;
            document.getElementById('courseModalLabel').textContent = '编辑课程';
        }
    } else {
        document.getElementById('courseModalLabel').textContent = '新增课程';
    }
    courseModal.show();
}

async function saveCourse() {
    const form = document.getElementById('courseForm');
    const id = document.getElementById('courseId').value;
    
    const course = {
        id: id || generateId('crs_'),
        code: form.elements['code'].value,
        name: form.elements['name'].value,
        credits: parseInt(form.elements['credits'].value),
        department: form.elements['department'].value
    };

    await db.put(STORAGE_KEYS.COURSES, course);
    courseModal.hide();
    loadAllData();
}

async function deleteCourse(id) {
    if (confirm('确定删除该课程吗？')) {
        await db.delete(STORAGE_KEYS.COURSES, id);
        loadAllData();
    }
}

// ==========================================
// 开课计划与排课管理 (Refactored)
// ==========================================

// 状态管理
let planState = {
    currentPage: 1,
    itemsPerPage: 10,
    filters: {
        search: '',
        semester: '',
        teacherId: ''
    }
};

function renderPlans() {
    const tbody = document.querySelector('#plan-table tbody');
    if (!tbody) return;

    // 1. 获取过滤条件
    const searchInput = document.getElementById('planSearchInput');
    const semesterSelect = document.getElementById('planFilterSemester');
    const teacherSelect = document.getElementById('planFilterTeacher');

    planState.filters.search = searchInput ? searchInput.value.trim().toLowerCase() : '';
    planState.filters.semester = semesterSelect ? semesterSelect.value : '';
    planState.filters.teacherId = teacherSelect ? teacherSelect.value : '';

    // 2. 过滤数据
    let filtered = currentPlans.filter(p => {
        const courseName = getCourseName(p.courseId).toLowerCase();
        const teacherName = getUserName(p.teacherId).toLowerCase();
        const classroom = p.classroom.toLowerCase();
        const search = planState.filters.search;

        const matchSearch = !search || courseName.includes(search) || teacherName.includes(search) || classroom.includes(search);
        const matchSemester = !planState.filters.semester || p.semester === planState.filters.semester;
        const matchTeacher = !planState.filters.teacherId || p.teacherId === planState.filters.teacherId;

        return matchSearch && matchSemester && matchTeacher;
    });

    // 3. 排序 (复用全局 sortState)
    if (sortState.tableId === 'plan-table' && sortState.field) {
        filtered.sort((a, b) => {
            let valA, valB;
            if (sortState.field === 'courseName') valA = getCourseName(a.courseId);
            else if (sortState.field === 'teacherName') valA = getUserName(a.teacherId);
            else valA = a[sortState.field];

            if (sortState.field === 'courseName') valB = getCourseName(b.courseId);
            else if (sortState.field === 'teacherName') valB = getUserName(b.teacherId);
            else valB = b[sortState.field];

            if (valA < valB) return sortState.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortState.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    // 4. 更新统计
    const badge = document.getElementById('planCountBadge');
    if (badge) badge.textContent = `共 ${filtered.length} 条`;

    // 5. 分页
    const totalPages = Math.ceil(filtered.length / planState.itemsPerPage);
    if (planState.currentPage > totalPages) planState.currentPage = totalPages || 1;
    
    const start = (planState.currentPage - 1) * planState.itemsPerPage;
    const end = start + planState.itemsPerPage;
    const pageData = filtered.slice(start, end);

    // 6. 渲染表格
    tbody.innerHTML = pageData.map((p, index) => `
        <tr>
            <td class="ps-4">${start + index + 1}</td>
            <td>${getCourseName(p.courseId)}</td>
            <td>${getUserName(p.teacherId)}</td>
            <td><span class="badge bg-light text-dark border">${p.semester}</span></td>
            <td>${p.classroom}</td>
            <td>${formatTimeSlots(p.timeSlots)}</td>
            <td class="text-end pe-4">
                <button class="btn btn-sm btn-outline-primary me-1" onclick="openPlanModal('${p.id}')" title="编辑">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deletePlan('${p.id}')" title="删除">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');

    if (filtered.length === 0) {
        if (planState.filters.search) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">
                <i class="bi bi-search me-2"></i>没有找到与 "<strong>${planState.filters.search}</strong>" 相关的开课记录
            </td></tr>`;
        } else {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">暂无数据</td></tr>';
        }
    }

    // 7. 渲染分页控件
    renderPagination('planPagination', totalPages, planState.currentPage, (page) => {
        planState.currentPage = page;
        renderPlans();
    });

    // 8. 更新下拉选项 (仅在初始化或数据变化时)
    updatePlanFilterOptions();
}

function handlePlanSearch() {
    const searchInput = document.getElementById('planSearchInput');
    if (searchInput && searchInput.value.trim() === '') {
        // 空搜索提醒：临时修改 placeholder 并闪烁边框
        const originalPlaceholder = searchInput.placeholder;
        searchInput.placeholder = '请输入搜索关键词...';
        searchInput.classList.add('border-warning', 'shadow-sm');
        
        setTimeout(() => {
            searchInput.placeholder = originalPlaceholder;
            searchInput.classList.remove('border-warning', 'shadow-sm');
        }, 1500);
    }
    renderPlans();
}

function updatePlanFilterOptions() {
    const semesterSelect = document.getElementById('planFilterSemester');
    const teacherSelect = document.getElementById('planFilterTeacher');
    const scheduleSelect = document.getElementById('scheduleSemesterSelect');
    const teacherScheduleSelect = document.getElementById('teacherScheduleSemester');
    
    // 提取所有学期
    const semesters = [...new Set(currentPlans.map(p => p.semester))].sort().reverse();

    // 1. 更新筛选区的学期下拉框
    if (semesterSelect) {
        const currentSemester = semesterSelect.value;
        semesterSelect.innerHTML = '<option value="">所有学期</option>' + 
            semesters.map(s => `<option value="${s}">${s}</option>`).join('');
        semesterSelect.value = currentSemester;
    }

    // 2. 更新课表预览区的学期下拉框 (确保包含最新学期)
    const updateScheduleOptions = (select) => {
        if (!select) return;
        const currentVal = select.value;
        select.innerHTML = '<option value="">所有学期</option>' + semesters.map(s => `<option value="${s}">${s}</option>`).join('');
        
        // 如果当前值有效则保持，否则选中第一个
        if (currentVal && semesters.includes(currentVal)) {
            select.value = currentVal;
        } else if (currentVal === '') {
            select.value = '';
        } else {
            select.value = ''; // 默认选中 "所有学期"
        }
    };

    updateScheduleOptions(scheduleSelect);
    updateScheduleOptions(teacherScheduleSelect);

    // 3. 更新筛选区的教师下拉框
    if (teacherSelect) {
        const currentTeacher = teacherSelect.value;
        const teachers = currentUsers.filter(u => u.role === 'teacher');
        teacherSelect.innerHTML = '<option value="">所有教师</option>' + 
            teachers.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
        teacherSelect.value = currentTeacher;
    }

    // 3.1 更新课表预览区的教师下拉框
    const scheduleTeacherSelect = document.getElementById('teacherScheduleSelect');
    if (scheduleTeacherSelect) {
        const currentVal = scheduleTeacherSelect.value;
        const teachers = currentUsers.filter(u => u.role === 'teacher');
        scheduleTeacherSelect.innerHTML = '<option value="">请选择...</option>' + 
            teachers.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
        if (currentVal && teachers.some(t => t.id === currentVal)) {
            scheduleTeacherSelect.value = currentVal;
        }
    }

    // 4. 同步更新课表预览的学期 (如果筛选了特定学期)
    if (planState.filters.semester) {
        if (scheduleSelect) {
            scheduleSelect.value = planState.filters.semester;
            renderOverallSchedule();
        }
        
        if (teacherScheduleSelect) {
            teacherScheduleSelect.value = planState.filters.semester;
            // 仅当教师课表Tab激活时刷新
            const activeTab = document.querySelector('#scheduleTabs .nav-link.active');
            if (activeTab && activeTab.id === 'teacher-tab') {
                renderTeacherSchedule();
            }
        }
    }
}

function renderPagination(elementId, totalPages, currentPage, onPageChange) {
    const container = document.getElementById(elementId);
    if (!container) return;
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';
    // Prev
    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="event.preventDefault(); ${currentPage > 1 ? `window.changePage('${elementId}', ${currentPage - 1})` : ''}">上一页</a>
    </li>`;

    // Pages
    for (let i = 1; i <= totalPages; i++) {
        html += `<li class="page-item ${currentPage === i ? 'active' : ''}">
            <a class="page-link" href="#" onclick="event.preventDefault(); window.changePage('${elementId}', ${i})">${i}</a>
        </li>`;
    }

    // Next
    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="event.preventDefault(); ${currentPage < totalPages ? `window.changePage('${elementId}', ${currentPage + 1})` : ''}">下一页</a>
    </li>`;

    container.innerHTML = html;

    // 挂载全局回调
    window.changePage = (id, page) => {
        if (id === 'planPagination') {
            planState.currentPage = page;
            renderPlans();
        }
    };
}

// --- 模态框逻辑 ---

function openPlanModal(id = null) {
    const form = document.getElementById('planForm');
    form.reset();
    document.getElementById('planId').value = '';
    document.getElementById('conflictAlert').classList.add('d-none');
    
    // 填充下拉框
    const courseSelect = document.getElementById('planCourseId');
    const teacherSelect = document.getElementById('planTeacherId');
    
    courseSelect.innerHTML = '<option value="" disabled selected>请选择课程</option>' + 
        currentCourses.map(c => `<option value="${c.id}">${c.name} (${c.code})</option>`).join('');
    
    teacherSelect.innerHTML = '<option value="" disabled selected>请选择教师</option>' + 
        currentUsers.filter(u => u.role === 'teacher').map(t => `<option value="${t.id}">${t.name}</option>`).join('');

    if (id) {
        const p = currentPlans.find(x => x.id === id);
        if (p) {
            document.getElementById('planId').value = p.id;
            courseSelect.value = p.courseId;
            teacherSelect.value = p.teacherId;
            document.getElementById('planSemester').value = p.semester;
            document.getElementById('planClassroom').value = p.classroom;
            document.getElementById('planMaxStudents').value = p.maxStudents || 50;
            
            // 解析并填充 Checkbox
            // 假设格式: "周一,周三 1-2节,3-4节 (全周)" 或 简单格式 "周一 1-2节"
            // 这里我们需要一个解析函数，或者如果数据是简单格式，我们尝试解析
            parseAndFillTimeSlots(p.timeSlots, p.weekType);
            
            document.getElementById('planModalLabel').innerHTML = '<i class="bi bi-pencil-square me-2"></i>编辑开课计划';
        }
    } else {
        document.getElementById('planSemester').value = '2024-2025-1';
        document.getElementById('planModalLabel').innerHTML = '<i class="bi bi-calendar-plus me-2"></i>新增开课计划';
    }
    planModal.show();
}

async function savePlan() {
    const form = document.getElementById('planForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const id = document.getElementById('planId').value;
    const courseId = document.getElementById('planCourseId').value;
    const teacherId = document.getElementById('planTeacherId').value;
    const semester = document.getElementById('planSemester').value;
    const classroom = document.getElementById('planClassroom').value;
    const maxStudents = document.getElementById('planMaxStudents').value;

    // 获取 Checkbox 值
    const days = Array.from(document.querySelectorAll('input[name="planDay"]:checked')).map(cb => cb.value);
    const slots = Array.from(document.querySelectorAll('input[name="planSlot"]:checked')).map(cb => cb.value);
    const weekType = document.querySelector('input[name="weekType"]:checked').value;

    if (days.length === 0 || slots.length === 0) {
        alert('请至少选择一个上课星期和一节课');
        return;
    }

    // 构造 timeSlots 字符串 (用于显示和简单存储)
    // 格式: "周一,周三 1,2节 (全周)"
    const timeSlotsStr = `${days.join(',')} ${slots.join(',')}节`;

    // 冲突检测
    const conflict = checkConflict(id, semester, classroom, teacherId, days, slots, weekType);
    if (conflict) {
        const alertBox = document.getElementById('conflictAlert');
        document.getElementById('conflictMsg').textContent = conflict;
        alertBox.classList.remove('d-none');
        return;
    }

    const plan = {
        id: id || generateId('plan_'),
        courseId,
        teacherId,
        semester,
        classroom,
        timeSlots: timeSlotsStr,
        weekType, // 新增字段存储周类型
        maxStudents: parseInt(maxStudents)
    };

    await db.put(STORAGE_KEYS.COURSE_PLANS, plan);
    planModal.hide();
    loadAllData();
}

async function deletePlan(id) {
    if (confirm('确定删除该计划吗？')) {
        await db.delete(STORAGE_KEYS.COURSE_PLANS, id);
        loadAllData();
    }
}

// --- 辅助函数 ---

function formatTimeSlots(str) {
    // 简单美化显示
    return str.replace(/,/g, '、');
}

function parseAndFillTimeSlots(timeSlotsStr, weekTypeVal) {
    // 重置所有 Checkbox
    document.querySelectorAll('input[name="planDay"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('input[name="planSlot"]').forEach(cb => cb.checked = false);
    
    if (!timeSlotsStr) return;

    // 尝试解析 "周一,周三 1,2节"
    const parts = timeSlotsStr.split(' ');
    if (parts.length >= 2) {
        const daysPart = parts[0]; // "周一,周三"
        const slotsPart = parts[1]; // "1,2节" or "1-2节"

        daysPart.split(',').forEach(d => {
            const cb = document.querySelector(`input[name="planDay"][value="${d}"]`);
            if (cb) cb.checked = true;
        });

        // 处理节次: 支持 "1,2节" 和 "1-2节"
        let slots = [];
        if (slotsPart.includes('-')) {
            // "1-2节" -> [1, 2]
            const range = slotsPart.replace('节', '').split('-');
            const start = parseInt(range[0]);
            const end = parseInt(range[1]);
            for (let i = start; i <= end; i++) slots.push(i.toString());
        } else {
            // "1,2节" -> [1, 2]
            slots = slotsPart.replace('节', '').split(',');
        }

        slots.forEach(s => {
            const cb = document.querySelector(`input[name="planSlot"][value="${s}"]`);
            if (cb) cb.checked = true;
        });
    }

    // 周类型
    if (weekTypeVal) {
        const radio = document.querySelector(`input[name="weekType"][value="${weekTypeVal}"]`);
        if (radio) radio.checked = true;
    }
}

function checkConflict(currentId, semester, classroom, teacherId, days, slots, weekType) {
    // 简单的冲突检测逻辑
    for (const p of currentPlans) {
        if (p.id === currentId) continue; // 跳过自己
        if (p.semester !== semester) continue; // 不同学期不冲突

        // 解析现有计划的时间
        // 假设现有数据格式可能不统一，这里做简单处理
        // 如果是旧数据 "周一 1-2节"，我们需要解析它
        const pDays = p.timeSlots.split(' ')[0].split(',');
        const pSlotsStr = p.timeSlots.split(' ')[1].replace('节', '');
        let pSlots = [];
        if (pSlotsStr.includes('-')) {
            const [s, e] = pSlotsStr.split('-').map(Number);
            for (let i = s; i <= e; i++) pSlots.push(i.toString());
        } else {
            pSlots = pSlotsStr.split(',');
        }

        // 检查时间重叠
        const dayOverlap = days.some(d => pDays.includes(d));
        const slotOverlap = slots.some(s => pSlots.includes(s));
        
        // 周类型重叠 (简单处理：如果都不是 'all' 且不同，则不冲突；否则冲突)
        // all vs odd -> conflict
        // odd vs even -> no conflict
        const pWeekType = p.weekType || 'all';
        let weekOverlap = true;
        if (weekType !== 'all' && pWeekType !== 'all' && weekType !== pWeekType) {
            weekOverlap = false;
        }

        if (dayOverlap && slotOverlap && weekOverlap) {
            if (p.classroom === classroom) {
                return `教室冲突：${p.classroom} 在该时间段已有课程 (${getCourseName(p.courseId)})`;
            }
            if (p.teacherId === teacherId) {
                return `教师冲突：该教师在该时间段已有课程 (${getCourseName(p.courseId)})`;
            }
        }
    }
    return null;
}

// --- 课表预览逻辑 ---

function renderSchedule() {
    // 初始化下拉框
    const semesterSelect = document.getElementById('scheduleSemesterSelect');
    const teacherSemesterSelect = document.getElementById('teacherScheduleSemester');
    const teacherSelect = document.getElementById('teacherScheduleSelect');
    
    if (!semesterSelect || !teacherSemesterSelect || !teacherSelect) return;

    // 1. 更新学期下拉框 (保持当前选中值)
    const currentSemesters = [...new Set(currentPlans.map(p => p.semester))].sort().reverse();
    
    const updateSelect = (select, options) => {
        const currentVal = select.value;
        // 增加 "所有学期" 选项
        select.innerHTML = '<option value="">所有学期</option>' + options.map(s => `<option value="${s}">${s}</option>`).join('');
        
        // 如果当前选中的值仍在列表中，保持选中；否则选中第一个(所有学期)
        if (currentVal && options.includes(currentVal)) {
            select.value = currentVal;
        } else {
            select.value = ''; // 默认选中 "所有学期"
        }
    };

    updateSelect(semesterSelect, currentSemesters);
    updateSelect(teacherSemesterSelect, currentSemesters);
    
    // 2. 更新教师下拉框 (保持当前选中值)
    const teachers = currentUsers.filter(u => u.role === 'teacher');
    const currentTeacherVal = teacherSelect.value;
    
    teacherSelect.innerHTML = '<option value="">请选择...</option>' + 
        teachers.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
        
    if (currentTeacherVal) {
        // 检查该教师是否还存在
        if (teachers.some(t => t.id === currentTeacherVal)) {
            teacherSelect.value = currentTeacherVal;
        }
    }

    // 3. 渲染当前视图
    // 检查当前激活的 Tab
    const activeTab = document.querySelector('#scheduleTabs .nav-link.active');
    if (activeTab && activeTab.id === 'teacher-tab') {
        renderTeacherSchedule();
    } else {
        renderOverallSchedule();
    }
}

function renderOverallSchedule() {
    const semester = document.getElementById('scheduleSemesterSelect').value;
    const tbody = document.querySelector('#overall-schedule-table tbody');
    if (!tbody) return;

    let plans = currentPlans;
    if (semester) {
        plans = plans.filter(p => p.semester === semester);
    }
    renderScheduleGrid(tbody, plans, !semester);
}

function renderTeacherSchedule() {
    const semester = document.getElementById('teacherScheduleSemester').value;
    const teacherId = document.getElementById('teacherScheduleSelect').value;
    const tbody = document.querySelector('#teacher-schedule-table tbody');
    const title = document.getElementById('teacherScheduleTitle');
    
    if (!teacherId) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-5 text-muted">请选择教师查看课表</td></tr>';
        title.textContent = '请选择教师查看课表';
        return;
    }

    title.textContent = `${getUserName(teacherId)} - 课表预览`;
    let plans = currentPlans.filter(p => p.teacherId === teacherId);
    if (semester) {
        plans = plans.filter(p => p.semester === semester);
    }
    renderScheduleGrid(tbody, plans, !semester);
}

function renderScheduleGrid(tbody, plans, showSemester = false) {
    const days = ['周一', '周二', '周三', '周四', '周五'];
    const slots = [1, 2, 3, 4, 5, 6, 7, 8]; // 8节课
    
    let html = '';
    
    // 2节课为一组显示，或者每节课一行？通常大学课表是2节一组或1节一行。
    // 为了简化，我们按 1-2, 3-4, 5-6, 7-8 显示，如果计划是单节的，可能会显示不准。
    // 但我们的输入支持单节。为了准确，我们按 1,2,3,4... 8行显示？太长了。
    // 让我们按 "大节" (Section) 显示： 第1-2节, 第3-4节...
    // 如果有课程只占第1节，它会显示在 1-2节 的格子里。
    
    const sections = [
        { name: '第1-2节', slots: ['1', '2'] },
        { name: '第3-4节', slots: ['3', '4'] },
        { name: '第5-6节', slots: ['5', '6'] },
        { name: '第7-8节', slots: ['7', '8'] }
    ];

    html = sections.map(section => {
        return `
            <tr>
                <td class="table-light fw-bold align-middle">${section.name}</td>
                ${days.map(day => {
                    // 查找在该天、该大节内有课的计划
                    // 只要计划的 slots 与 section.slots 有交集
                    const cellPlans = plans.filter(p => {
                        const pDays = p.timeSlots.split(' ')[0].split(',');
                        const pSlotsStr = p.timeSlots.split(' ')[1].replace('节', '');
                        let pSlots = [];
                        if (pSlotsStr.includes('-')) {
                            const [s, e] = pSlotsStr.split('-').map(Number);
                            for (let i = s; i <= e; i++) pSlots.push(i.toString());
                        } else {
                            pSlots = pSlotsStr.split(',');
                        }
                        
                        const dayMatch = pDays.includes(day);
                        const slotMatch = section.slots.some(s => pSlots.includes(s));
                        return dayMatch && slotMatch;
                    });

                    if (cellPlans.length > 0) {
                        const isConflict = cellPlans.length > 1; // 简单判断：同一格有多个课
                        // 注意：如果是整体课表，同一格有多个课是正常的（不同教室）。
                        // 只有当 教室相同 或 教师相同 时才是冲突。
                        // 但在格子显示里，我们列出所有。
                        
                        const content = cellPlans.map(p => `
                            <div class="mb-1 pb-1 border-bottom border-light-subtle last-no-border">
                                <div class="fw-bold small">${getCourseName(p.courseId)}</div>
                                <div class="small">${getUserName(p.teacherId)}</div>
                                <div class="small badge bg-secondary bg-opacity-10 text-dark">@${p.classroom}</div>
                                ${showSemester ? `<div class="small text-muted scale-08 mt-1">${p.semester}</div>` : ''}
                            </div>
                        `).join('');
                        
                        return `<td class="align-middle ${isConflict ? '' : ''}"><div class="schedule-cell text-start">${content}</div></td>`;
                    } else {
                        return '<td></td>';
                    }
                }).join('')}
            </tr>
        `;
    }).join('');

    tbody.innerHTML = html;
}

// ==========================================
// 成绩审核
// ==========================================

function renderScoreAudit() {
    const tbody = document.querySelector('#score-audit-table tbody');
    if (!tbody) return;

    const semesterPlans = currentPlans.filter(p => p.semester === '2024-2025-1');
    
    tbody.innerHTML = semesterPlans.map(plan => {
        const planScores = currentScores.filter(s => s.coursePlanId === plan.id);
        const count = planScores.length;
        let avg = 0, excellenceRate = 0, passRate = 0, status = 'unpublished';
        let isAbnormal = false;

        if (count > 0) {
            const total = planScores.reduce((sum, s) => sum + (s.total || 0), 0);
            avg = (total / count).toFixed(1);
            excellenceRate = ((planScores.filter(s => s.total >= 90).length / count) * 100).toFixed(1);
            passRate = ((planScores.filter(s => s.total >= 60).length / count) * 100).toFixed(1);
            if (planScores.some(s => s.status === 'published')) status = 'published';
            
            // 异常检测: 优秀率>60% 或 及格率<70%
            if (parseFloat(excellenceRate) > 60 || parseFloat(passRate) < 70) {
                isAbnormal = true;
            }
        }

        return `
            <tr class="${isAbnormal ? 'table-danger' : ''}">
                <td><a href="#" onclick="viewScoreDetails('${plan.id}'); return false;">${getCourseName(plan.courseId)}</a></td>
                <td>${getUserName(plan.teacherId)}</td>
                <td>${count}</td>
                <td>${avg}</td>
                <td>${excellenceRate}%</td>
                <td>${passRate}%</td>
                <td>
                    <span class="badge ${status === 'published' ? 'bg-success' : 'bg-secondary'}">
                        ${status === 'published' ? '已发布' : '未发布'}
                    </span>
                </td>
                <td>
                    ${status !== 'published' ? 
                        `<button class="btn btn-sm btn-success" onclick="publishScore('${plan.id}')">发布</button>` : 
                        `<button class="btn btn-sm btn-secondary" disabled>已发布</button>`
                    }
                </td>
            </tr>
        `;
    }).join('');
}

function viewScoreDetails(planId) {
    const tbody = document.querySelector('#score-detail-table tbody');
    const planScores = currentScores.filter(s => s.coursePlanId === planId);
    
    tbody.innerHTML = planScores.map(s => {
        // 异常检测: 期末与期中分差 > 20
        const mid = s.midterm || 0;
        const final = s.final || 0;
        const diff = final - mid;
        let anomalyHtml = '';
        
        if (Math.abs(diff) > 20) {
            const type = diff > 0 ? '突升' : '突降';
            anomalyHtml = `<span class="badge bg-danger">${type} ${Math.abs(diff)}分</span>`;
        }

        return `
            <tr>
                <td>${getUserName(s.studentId, 'username')}</td>
                <td>${getUserName(s.studentId)}</td>
                <td>
                    <small class="d-block text-muted">小测: ${s.quiz || '-'}</small>
                    <strong>期中: ${s.midterm || '-'}</strong>
                </td>
                <td><strong>${s.final || '-'}</strong></td>
                <td class="text-primary fw-bold">${s.total}</td>
                <td>${anomalyHtml}</td>
            </tr>
        `;
    }).join('');

    scoreDetailModal.show();
}

async function publishScore(planId) {
    if (!confirm('确定发布该课程成绩吗？')) return;
    
    const planScores = currentScores.filter(s => s.coursePlanId === planId);
    for (const s of planScores) {
        s.status = 'published';
        await db.put(STORAGE_KEYS.SCORES, s);
    }
    
    loadAllData();
}

// ==========================================
// 辅助函数
// ==========================================

function getClassName(id) {
    return currentClasses.find(c => c.id === id)?.name || '-';
}

function getCourseName(id) {
    return currentCourses.find(c => c.id === id)?.name || '未知课程';
}

function getUserName(id, field = 'name') {
    return currentUsers.find(u => u.id === id)?.[field] || '未知用户';
}

function getGenderLabel(gender) {
    const map = { 'male': '男', 'female': '女', 'secret': '保密' };
    return map[gender] || '-';
}

function getRegionLabel(region) {
    const map = {
        'beijing': '北京',
        'shanghai': '上海',
        'guangdong': '广东',
        'zhejiang': '浙江',
        'jiangsu': '江苏'
    };
    return map[region] || region || '-';
}

// 显式暴露给全局作用域 (防止某些环境下的作用域问题)
window.handleSort = handleSort;
window.exportAllScores = exportAllScores;
window.logout = logout;
window.handleStudentSearch = handleStudentSearch;
window.handlePlanSearch = handlePlanSearch;
window.openClassModal = openClassModal;
window.viewClassStudents = viewClassStudents;
window.deleteClass = deleteClass;
window.saveClass = saveClass;
window.openStudentModal = openStudentModal;
window.deleteUser = deleteUser;
window.saveStudent = saveStudent;
window.openTeacherModal = openTeacherModal;
window.saveTeacher = saveTeacher;
window.openCourseModal = openCourseModal;
window.deleteCourse = deleteCourse;
window.saveCourse = saveCourse;
window.openPlanModal = openPlanModal;
window.deletePlan = deletePlan;
window.savePlan = savePlan;
window.viewScoreDetails = viewScoreDetails;
window.publishScore = publishScore;
window.switchToStudentEdit = switchToStudentEdit;
window.cancelEdit = cancelEdit;
window.saveStudentProfile = saveStudentProfile;
window.toggleEmailEdit = toggleEmailEdit;
window.confirmEmailEdit = confirmEmailEdit;
window.cancelEmailEdit = cancelEmailEdit;
window.togglePhoneEdit = togglePhoneEdit;
window.confirmPhoneEdit = confirmPhoneEdit;
window.cancelPhoneEdit = cancelPhoneEdit;
window.unbindPhone = unbindPhone;
window.triggerAvatarUpload = triggerAvatarUpload;
window.handleAvatarChange = handleAvatarChange;

console.log('Admin script loaded successfully.');
