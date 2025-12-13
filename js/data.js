/**
 * 数据管理模块
 * 负责 LocalStorage 的读写和初始化模拟数据
 */

const STORAGE_KEYS = {
    USERS: 'cms_users',
    CLASSES: 'cms_classes',
    COURSES: 'cms_courses',
    COURSE_PLANS: 'cms_course_plans',
    ENROLLMENTS: 'cms_enrollments',
    SCORES: 'cms_scores',
    DATA_VERSION: 'cms_data_v4_intra_course' // 升级版本号
};

function generateId(prefix = '') {
    return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error('Error saving to localStorage', e);
        alert('存储空间不足或写入失败！');
    }
}

function loadFromStorage(key) {
    const data = localStorage.getItem(key);
    try {
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error('Error parsing data from localStorage', e);
        return null;
    }
}

function initData() {
    if (localStorage.getItem(STORAGE_KEYS.DATA_VERSION) === 'true') {
        return;
    }

    console.log('Initializing data with Midterm/Final comparison scenarios...');
    localStorage.clear();
    localStorage.setItem(STORAGE_KEYS.DATA_VERSION, 'true');

    // 1. 班级
    const classes = [
        { id: 'cls_001', name: '计算机2101' },
        { id: 'cls_002', name: '软件2101' }
    ];

    // 2. 用户
    const users = [
        { id: 'admin_001', username: 'admin', name: '管理员', role: 'admin' },
        { id: 'tea_001', username: 't_wang', name: '王老师', role: 'teacher' },
        { id: 'tea_002', username: 't_li', name: '李老师', role: 'teacher' },
        { id: 'tea_003', username: 't_zhang', name: '张老师', role: 'teacher' },
    ];

    for (let i = 1; i <= 10; i++) {
        users.push({
            id: `stu_00${i}`,
            username: `202100${i}`,
            name: i === 1 ? '张三(波动大)' : (i === 2 ? '李四(逆袭)' : `学生${i}`),
            role: 'student',
            classId: i <= 5 ? 'cls_001' : 'cls_002'
        });
    }

    // 3. 课程
    const courses = [
        { id: 'crs_001', code: 'CS101', name: '高等数学', credits: 5, department: '基础部' },
        { id: 'crs_002', code: 'CS102', name: '体育', credits: 2, department: '体育部' },
        { id: 'crs_003', code: 'CS103', name: 'Java程序设计', credits: 4, department: '计算机学院' }
    ];

    // 4. 开课计划
    const coursePlans = [
        { id: 'plan_001', courseId: 'crs_001', teacherId: 'tea_001', semester: '2024-2025-1', classroom: 'A101', timeSlots: '周一 1-2节' },
        { id: 'plan_002', courseId: 'crs_002', teacherId: 'tea_002', semester: '2024-2025-1', classroom: '操场', timeSlots: '周二 3-4节' },
        { id: 'plan_003', courseId: 'crs_003', teacherId: 'tea_003', semester: '2024-2025-1', classroom: '机房1', timeSlots: '周三 5-6节' }
    ];

    // 5. 成绩录入 (支持期中、小测、期末)
    const scores = [];

    const addScore = (planId, studentId, final, midterm = null, quiz = null, status = 'unpublished') => {
        // 如果未提供期中/小测，默认与期末相近，避免误报异常
        const mid = midterm !== null ? midterm : final;
        const qz = quiz !== null ? quiz : final;
        
        // 总评 = 小测20% + 期中30% + 期末50%
        const total = Math.round(qz * 0.2 + mid * 0.3 + final * 0.5);

        scores.push({
            id: generateId('score_'),
            coursePlanId: planId,
            studentId: studentId,
            items: {
                quiz: qz,
                midterm: mid,
                final: final
            },
            total: total,
            status: status
        });
    };

    // --- Plan A: 高等数学 (测试成绩下滑) ---
    // S1: 期中 90, 期末 55 -> 严重下滑 (差值 -35)
    addScore('plan_001', 'stu_001', 55, 90, 85);
    
    // S2: 稳定低分
    addScore('plan_001', 'stu_002', 45, 50, 48);

    // 其他人稳定
    for(let i=3; i<=10; i++) addScore('plan_001', `stu_00${i}`, 75, 72, 78);


    // --- Plan B: 体育 (测试成绩突升) ---
    // S1: 稳定高分
    addScore('plan_002', 'stu_001', 95, 92, 94);

    // S2: 期中 60, 期末 92 -> 突升 (差值 +32)
    addScore('plan_002', 'stu_002', 92, 60, 65);

    // 其他人稳定
    for(let i=3; i<=10; i++) addScore('plan_002', `stu_00${i}`, 85, 82, 88);


    // --- Plan C: Java (正常) ---
    for(let i=1; i<=10; i++) addScore('plan_003', `stu_00${i}`, 80, 82, 78, 'published');

    saveToStorage(STORAGE_KEYS.CLASSES, classes);
    saveToStorage(STORAGE_KEYS.USERS, users);
    saveToStorage(STORAGE_KEYS.COURSES, courses);
    saveToStorage(STORAGE_KEYS.COURSE_PLANS, coursePlans);
    saveToStorage(STORAGE_KEYS.SCORES, scores);

    console.log('Mock data initialized with intra-course anomalies.');
}

initData();
