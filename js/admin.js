/**
 * 教学管理员端逻辑
 */

// 全局变量存储当前数据
let currentClasses = [];
let currentCourses = [];
let currentPlans = [];
let currentUsers = [];
let currentScores = [];

// Bootstrap Modal 实例
let classModal, courseModal, planModal, scoreDetailModal;

document.addEventListener('DOMContentLoaded', () => {
    // 初始化 Modals
    classModal = new bootstrap.Modal(document.getElementById('classModal'));
    courseModal = new bootstrap.Modal(document.getElementById('courseModal'));
    planModal = new bootstrap.Modal(document.getElementById('planModal'));
    scoreDetailModal = new bootstrap.Modal(document.getElementById('scoreDetailModal'));

    // 绑定导航事件
    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            if (e.target.classList.contains('disabled')) return;
            e.preventDefault();
            
            // 切换激活状态
            document.querySelectorAll('.sidebar .nav-link').forEach(l => l.classList.remove('active'));
            e.target.classList.add('active');

            // 切换内容显示
            const targetId = e.target.getAttribute('data-target');
            document.querySelectorAll('.content-section').forEach(section => {
                section.style.display = 'none';
            });
            document.getElementById(targetId).style.display = 'block';

            // 重新加载数据
            loadAllData();
        });
    });

    // 初始加载
    loadAllData();
});

/**
 * 加载所有数据并渲染当前视图
 */
function loadAllData() {
    currentClasses = loadFromStorage(STORAGE_KEYS.CLASSES) || [];
    currentCourses = loadFromStorage(STORAGE_KEYS.COURSES) || [];
    currentPlans = loadFromStorage(STORAGE_KEYS.COURSE_PLANS) || [];
    currentUsers = loadFromStorage(STORAGE_KEYS.USERS) || [];
    currentScores = loadFromStorage(STORAGE_KEYS.SCORES) || [];

    renderClasses();
    renderCourses();
    renderPlans();
    renderSchedule();
    renderScoreAudit();
}

// ==========================================
// 班级管理
// ==========================================

function renderClasses() {
    const tbody = document.querySelector('#class-table tbody');
    tbody.innerHTML = currentClasses.map(cls => `
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
            document.getElementById('className').value = cls.name;
        }
    }
    classModal.show();
}

function saveClass() {
    const id = document.getElementById('classId').value;
    const name = document.getElementById('className').value;

    if (!name) return alert('请输入班级名称');

    if (id) {
        // 更新
        const index = currentClasses.findIndex(c => c.id === id);
        if (index !== -1) {
            currentClasses[index].name = name;
        }
    } else {
        // 新增
        currentClasses.push({
            id: generateId('cls_'),
            name: name
        });
    }

    saveToStorage(STORAGE_KEYS.CLASSES, currentClasses);
    classModal.hide();
    renderClasses();
}

function deleteClass(id) {
    if (!confirm('确定要删除这个班级吗？')) return;
    currentClasses = currentClasses.filter(c => c.id !== id);
    saveToStorage(STORAGE_KEYS.CLASSES, currentClasses);
    renderClasses();
}

// ==========================================
// 课程管理
// ==========================================

function renderCourses() {
    const tbody = document.querySelector('#course-table tbody');
    tbody.innerHTML = currentCourses.map(crs => `
        <tr>
            <td>${crs.code}</td>
            <td>${crs.name}</td>
            <td>${crs.credits}</td>
            <td>${crs.department}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="openCourseModal('${crs.id}')">编辑</button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteCourse('${crs.id}')">删除</button>
            </td>
        </tr>
    `).join('');
}

function openCourseModal(id = null) {
    const form = document.getElementById('courseForm');
    form.reset();
    document.getElementById('courseId').value = '';

    if (id) {
        const crs = currentCourses.find(c => c.id === id);
        if (crs) {
            document.getElementById('courseId').value = crs.id;
            document.getElementById('courseCode').value = crs.code;
            document.getElementById('courseName').value = crs.name;
            document.getElementById('courseCredits').value = crs.credits;
            document.getElementById('courseDept').value = crs.department;
        }
    }
    courseModal.show();
}

function saveCourse() {
    const id = document.getElementById('courseId').value;
    const code = document.getElementById('courseCode').value;
    const name = document.getElementById('courseName').value;
    const credits = document.getElementById('courseCredits').value;
    const dept = document.getElementById('courseDept').value;

    if (!code || !name) return alert('请填写完整信息');

    const newCourse = {
        id: id || generateId('crs_'),
        code,
        name,
        credits: parseInt(credits),
        department: dept
    };

    if (id) {
        const index = currentCourses.findIndex(c => c.id === id);
        if (index !== -1) currentCourses[index] = newCourse;
    } else {
        currentCourses.push(newCourse);
    }

    saveToStorage(STORAGE_KEYS.COURSES, currentCourses);
    courseModal.hide();
    renderCourses();
}

function deleteCourse(id) {
    if (!confirm('确定要删除这个课程吗？')) return;
    currentCourses = currentCourses.filter(c => c.id !== id);
    saveToStorage(STORAGE_KEYS.COURSES, currentCourses);
    renderCourses();
}

// ==========================================
// 开课计划管理
// ==========================================

function renderPlans() {
    const tbody = document.querySelector('#plan-table tbody');
    tbody.innerHTML = currentPlans.map(plan => {
        const course = currentCourses.find(c => c.id === plan.courseId) || { name: '未知课程' };
        const teacher = currentUsers.find(u => u.id === plan.teacherId) || { name: '未知教师' };
        
        return `
        <tr>
            <td>${course.name}</td>
            <td>${teacher.name}</td>
            <td>${plan.semester}</td>
            <td>${plan.classroom}</td>
            <td>${plan.timeSlots}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="openPlanModal('${plan.id}')">编辑</button>
                <button class="btn btn-sm btn-outline-danger" onclick="deletePlan('${plan.id}')">删除</button>
            </td>
        </tr>
    `}).join('');
}

function openPlanModal(id = null) {
    const form = document.getElementById('planForm');
    form.reset();
    document.getElementById('planId').value = '';

    // 填充下拉框
    const courseSelect = document.getElementById('planCourseId');
    courseSelect.innerHTML = '<option value="">请选择课程</option>' + 
        currentCourses.map(c => `<option value="${c.id}">${c.name} (${c.code})</option>`).join('');

    const teacherSelect = document.getElementById('planTeacherId');
    const teachers = currentUsers.filter(u => u.role === 'teacher');
    teacherSelect.innerHTML = '<option value="">请选择教师</option>' + 
        teachers.map(t => `<option value="${t.id}">${t.name}</option>`).join('');

    if (id) {
        const plan = currentPlans.find(p => p.id === id);
        if (plan) {
            document.getElementById('planId').value = plan.id;
            document.getElementById('planCourseId').value = plan.courseId;
            document.getElementById('planTeacherId').value = plan.teacherId;
            document.getElementById('planSemester').value = plan.semester;
            document.getElementById('planClassroom').value = plan.classroom;
            
            // 解析时间 "周一 1-2节"
            const parts = plan.timeSlots.split(' ');
            if (parts.length === 2) {
                document.getElementById('planDay').value = parts[0];
                document.getElementById('planSlot').value = parts[1];
            }
        }
    }
    planModal.show();
}

function savePlan() {
    const id = document.getElementById('planId').value;
    const courseId = document.getElementById('planCourseId').value;
    const teacherId = document.getElementById('planTeacherId').value;
    const semester = document.getElementById('planSemester').value;
    const classroom = document.getElementById('planClassroom').value;
    const day = document.getElementById('planDay').value;
    const slot = document.getElementById('planSlot').value;

    if (!courseId || !teacherId) return alert('请选择课程和教师');

    const timeSlots = `${day} ${slot}`;

    // 简单的冲突检测 (可选)
    // ...

    const newPlan = {
        id: id || generateId('plan_'),
        courseId,
        teacherId,
        semester,
        classroom,
        timeSlots
    };

    if (id) {
        const index = currentPlans.findIndex(p => p.id === id);
        if (index !== -1) currentPlans[index] = newPlan;
    } else {
        currentPlans.push(newPlan);
    }

    saveToStorage(STORAGE_KEYS.COURSE_PLANS, currentPlans);
    planModal.hide();
    renderPlans();
    renderSchedule();
}

function deletePlan(id) {
    if (!confirm('确定要删除这个开课计划吗？')) return;
    currentPlans = currentPlans.filter(p => p.id !== id);
    saveToStorage(STORAGE_KEYS.COURSE_PLANS, currentPlans);
    renderPlans();
    renderSchedule();
}

// ==========================================
// 课表渲染 (可视化)
// ==========================================

function renderSchedule() {
    const tbody = document.querySelector('#schedule-table tbody');
    const slots = ['1-2节', '3-4节', '5-6节', '7-8节'];
    const days = ['周一', '周二', '周三', '周四', '周五'];

    let html = '';

    slots.forEach(slot => {
        html += `<tr><td class="table-light fw-bold">${slot}</td>`;
        
        days.forEach(day => {
            // 查找该时间段的课程
            const plan = currentPlans.find(p => p.timeSlots === `${day} ${slot}` && p.semester === '2024-2025-1');
            
            if (plan) {
                const course = currentCourses.find(c => c.id === plan.courseId);
                const teacher = currentUsers.find(u => u.id === plan.teacherId);
                html += `
                    <td>
                        <div class="schedule-cell">
                            <strong>${course ? course.name : '未知'}</strong><br>
                            <small>${teacher ? teacher.name : '未知'}</small><br>
                            <small>@${plan.classroom}</small>
                        </div>
                    </td>
                `;
            } else {
                html += `<td></td>`;
            }
        });

        html += `</tr>`;
    });

    tbody.innerHTML = html;
}

// ==========================================
// 成绩审核与发布
// ==========================================

function renderScoreAudit() {
    const tbody = document.querySelector('#score-audit-table tbody');
    
    // 过滤出本学期的课程计划 (假设当前学期是 2024-2025-1)
    const semesterPlans = currentPlans.filter(p => p.semester === '2024-2025-1');

    tbody.innerHTML = semesterPlans.map(plan => {
        const course = currentCourses.find(c => c.id === plan.courseId) || { name: '未知课程' };
        const teacher = currentUsers.find(u => u.id === plan.teacherId) || { name: '未知教师' };
        
        // 获取该课程的所有成绩
        const planScores = currentScores.filter(s => s.coursePlanId === plan.id);
        const studentCount = planScores.length;
        
        let avgScore = 0;
        let excellenceRate = 0;
        let passRate = 0;
        let status = 'unpublished';

        if (studentCount > 0) {
            const totalScore = planScores.reduce((sum, s) => sum + (s.total || 0), 0);
            avgScore = (totalScore / studentCount).toFixed(1);
            
            const excellentCount = planScores.filter(s => (s.total || 0) >= 90).length;
            excellenceRate = ((excellentCount / studentCount) * 100).toFixed(1);
            
            const passCount = planScores.filter(s => (s.total || 0) >= 60).length;
            passRate = ((passCount / studentCount) * 100).toFixed(1);

            // 只要有一个是 published，就认为是 published (通常应该统一)
            if (planScores.some(s => s.status === 'published')) {
                status = 'published';
            }
        }

        // 异常检测
        // 课程维度：如果优秀率 > 60% 或及格率 < 70%，标记红色警告。
        const isAbnormal = (parseFloat(excellenceRate) > 60) || (parseFloat(passRate) < 70 && studentCount > 0);
        const rowClass = isAbnormal ? 'table-danger' : '';

        const statusBadge = status === 'published' 
            ? '<span class="badge bg-success">已发布</span>' 
            : '<span class="badge bg-secondary">未发布</span>';

        const publishBtn = status === 'published'
            ? `<button class="btn btn-sm btn-secondary" disabled>已发布</button>`
            : `<button class="btn btn-sm btn-success" onclick="publishScores('${plan.id}')">发布</button>`;

        return `
        <tr class="${rowClass}">
            <td><a href="#" onclick="viewScoreDetails('${plan.id}'); return false;">${course.name}</a></td>
            <td>${teacher.name}</td>
            <td>${studentCount}</td>
            <td>${avgScore}</td>
            <td>${excellenceRate}%</td>
            <td>${passRate}%</td>
            <td>${statusBadge}</td>
            <td>
                ${publishBtn}
            </td>
        </tr>
        `;
    }).join('');
}

function viewScoreDetails(planId) {
    const plan = currentPlans.find(p => p.id === planId);
    if (!plan) return;

    const course = currentCourses.find(c => c.id === plan.courseId);
    document.getElementById('scoreDetailTitle').innerText = `${course.name} - 成绩明细`;

    const planScores = currentScores.filter(s => s.coursePlanId === planId);
    const tbody = document.querySelector('#score-detail-table tbody');
    
    let hasStudentAnomaly = false;

    tbody.innerHTML = planScores.map(score => {
        const student = currentUsers.find(u => u.id === score.studentId) || { name: '未知学生', id: score.studentId };
        
        // 学生维度异常检测：如果某学生多门课成绩突然提升/下降超过 20 分
        // 逻辑：计算该学生在其他课程的平均分，与当前课程分数对比
        const otherScores = currentScores.filter(s => s.studentId === score.studentId && s.coursePlanId !== planId);
        let anomalyWarning = '';
        
        if (otherScores.length > 0) {
            const otherTotal = otherScores.reduce((sum, s) => sum + (s.total || 0), 0);
            const otherAvg = otherTotal / otherScores.length;
            const diff = (score.total || 0) - otherAvg;
            
            if (Math.abs(diff) > 20) {
                hasStudentAnomaly = true;
                const type = diff > 0 ? '突升' : '突降';
                anomalyWarning = `<span class="badge bg-danger" title="历史均分: ${otherAvg.toFixed(1)}">${type} ${Math.abs(diff).toFixed(1)}分</span>`;
            }
        }

        return `
        <tr>
            <td>${student.id}</td>
            <td>${student.name}</td>
            <td>
                平时: ${score.items.homework1 || 0}, ${score.items.homework2 || 0}
            </td>
            <td>${score.items.final || 0}</td>
            <td><strong>${score.total || 0}</strong></td>
            <td>${anomalyWarning}</td>
        </tr>
        `;
    }).join('');

    const warningBadge = document.getElementById('scoreDetailWarning');
    warningBadge.style.display = hasStudentAnomaly ? 'inline-block' : 'none';

    scoreDetailModal.show();
}

function publishScores(planId) {
    if (!confirm('发布后学生将可见成绩，且不可撤销。确定发布吗？')) return;

    // 更新该课程计划下所有成绩的状态
    let updatedCount = 0;
    currentScores.forEach(score => {
        if (score.coursePlanId === planId) {
            score.status = 'published';
            updatedCount++;
        }
    });

    if (updatedCount > 0) {
        saveToStorage(STORAGE_KEYS.SCORES, currentScores);
        alert(`成功发布 ${updatedCount} 条成绩记录！`);
        renderScoreAudit();
    } else {
        alert('该课程暂无成绩可发布。');
    }
}

function exportAllScores() {
    // 模拟导出
    alert('正在生成报表...\n导出成功！文件已保存为 scores_report_2024.xlsx');
}
