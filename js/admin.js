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
let classModal, courseModal, planModal, scoreDetailModal, studentModal, teacherModal;

document.addEventListener('DOMContentLoaded', () => {
    // 初始化 Modals
    classModal = new bootstrap.Modal(document.getElementById('classModal'));
    courseModal = new bootstrap.Modal(document.getElementById('courseModal'));
    planModal = new bootstrap.Modal(document.getElementById('planModal'));
    scoreDetailModal = new bootstrap.Modal(document.getElementById('scoreDetailModal'));
    studentModal = new bootstrap.Modal(document.getElementById('studentModal'));
    teacherModal = new bootstrap.Modal(document.getElementById('teacherModal'));

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

    tbody.innerHTML = displayData.map(cls => `
        <tr>
            <td>${cls.id}</td>
            <td>${cls.name}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="openClassModal('${cls.id}')">编辑</button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteClass('${cls.id}')">删除</button>
            </td>
        </tr>
    `).join('');
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
            <td>${stu.username}</td>
            <td>${stu.name}</td>
            <td>${getClassName(stu.classId)}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="openStudentModal('${stu.id}')">编辑</button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteUser('${stu.id}')">删除</button>
            </td>
        </tr>
    `).join('');
}

function openStudentModal(id = null) {
    const form = document.getElementById('studentForm');
    form.reset();
    document.getElementById('studentId').value = '';
    
    // 填充班级下拉框
    const classSelect = form.elements['classId'];
    classSelect.innerHTML = currentClasses.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    if (id) {
        const stu = currentUsers.find(u => u.id === id);
        if (stu) {
            document.getElementById('studentId').value = stu.id;
            form.elements['username'].value = stu.username;
            form.elements['name'].value = stu.name;
            form.elements['classId'].value = stu.classId;
            document.getElementById('studentModalLabel').textContent = '编辑学生';
        }
    } else {
        document.getElementById('studentModalLabel').textContent = '新增学生';
    }
    studentModal.show();
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
// 开课计划
// ==========================================

function renderPlans() {
    const tbody = document.querySelector('#plan-table tbody');
    if (!tbody) return;
    tbody.innerHTML = currentPlans.map(p => `
        <tr>
            <td>${getCourseName(p.courseId)}</td>
            <td>${getUserName(p.teacherId)}</td>
            <td>${p.semester}</td>
            <td>${p.classroom}</td>
            <td>${p.timeSlots}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="openPlanModal('${p.id}')">编辑</button>
                <button class="btn btn-sm btn-outline-danger" onclick="deletePlan('${p.id}')">删除</button>
            </td>
        </tr>
    `).join('');
}

function openPlanModal(id = null) {
    const form = document.getElementById('planForm');
    form.reset();
    document.getElementById('planId').value = '';
    
    // 填充下拉框
    form.elements['courseId'].innerHTML = currentCourses.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    form.elements['teacherId'].innerHTML = currentUsers.filter(u => u.role === 'teacher').map(t => `<option value="${t.id}">${t.name}</option>`).join('');

    if (id) {
        const p = currentPlans.find(x => x.id === id);
        if (p) {
            document.getElementById('planId').value = p.id;
            form.elements['courseId'].value = p.courseId;
            form.elements['teacherId'].value = p.teacherId;
            form.elements['semester'].value = p.semester;
            form.elements['classroom'].value = p.classroom;
            
            const [day, slot] = p.timeSlots.split(' ');
            form.elements['day'].value = day;
            form.elements['slot'].value = slot;
            
            document.getElementById('planModalLabel').textContent = '编辑计划';
        }
    } else {
        form.elements['semester'].value = '2024-2025-1';
        document.getElementById('planModalLabel').textContent = '新增计划';
    }
    planModal.show();
}

async function savePlan() {
    const form = document.getElementById('planForm');
    const id = document.getElementById('planId').value;
    
    const plan = {
        id: id || generateId('plan_'),
        courseId: form.elements['courseId'].value,
        teacherId: form.elements['teacherId'].value,
        semester: form.elements['semester'].value,
        classroom: form.elements['classroom'].value,
        timeSlots: `${form.elements['day'].value} ${form.elements['slot'].value}`
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

function renderSchedule() {
    const days = ['周一', '周二', '周三', '周四', '周五'];
    const slots = ['1-2节', '3-4节', '5-6节', '7-8节'];
    const tbody = document.querySelector('.schedule-table tbody');
    if (!tbody) return;

    tbody.innerHTML = slots.map(slot => `
        <tr>
            <td class="table-light fw-bold">${slot}</td>
            ${days.map(day => {
                const plan = currentPlans.find(p => p.timeSlots === `${day} ${slot}` && p.semester === '2024-2025-1');
                if (plan) {
                    return `
                        <td>
                            <div class="schedule-cell">
                                <strong>${getCourseName(plan.courseId)}</strong><br>
                                <small>${getUserName(plan.teacherId)}</small><br>
                                <small>@${plan.classroom}</small>
                            </div>
                        </td>
                    `;
                }
                return '<td></td>';
            }).join('')}
        </tr>
    `).join('');
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

// 显式暴露给全局作用域 (防止某些环境下的作用域问题)
window.handleSort = handleSort;
window.exportAllScores = exportAllScores;
window.logout = logout;
window.handleStudentSearch = handleStudentSearch;
window.openClassModal = openClassModal;
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

console.log('Admin script loaded successfully.');
