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
    DATA_VERSION: 'cms_data_v5_extreme' // 升级版本号
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

    console.log('Initializing EXTREME mock data...');
    localStorage.clear();
    localStorage.setItem(STORAGE_KEYS.DATA_VERSION, 'true');

    // 1. 班级
    const classes = [
        { id: 'cls_001', name: '计算机2101' },
        { id: 'cls_002', name: '软件2101' },
        { id: 'cls_003', name: '智能2101' }
    ];

    // 2. 用户 (生成30个学生)
    const users = [
        { id: 'admin_001', username: 'admin', name: '管理员', role: 'admin' },
        { id: 'tea_001', username: 't_wang', name: '王灭绝', role: 'teacher' }, // 挂科杀手
        { id: 'tea_002', username: 't_li', name: '李慈悲', role: 'teacher' },   // 给分天使
        { id: 'tea_003', username: 't_zhang', name: '张中庸', role: 'teacher' }, // 正常老师
    ];

    for (let i = 1; i <= 30; i++) {
        let name = `学生${i}`;
        if (i === 1) name = '张三(波动王)';
        if (i === 2) name = '李四(逆袭王)';
        
        users.push({
            id: `stu_${i.toString().padStart(3, '0')}`,
            username: `2021${i.toString().padStart(3, '0')}`,
            name: name,
            role: 'student',
            classId: i <= 10 ? 'cls_001' : (i <= 20 ? 'cls_002' : 'cls_003')
        });
    }

    // 3. 课程
    const courses = [
        { id: 'crs_001', code: 'MATH001', name: '理论力学', credits: 5, department: '物理系' }, // 极难
        { id: 'crs_002', code: 'ART001', name: '影视鉴赏', credits: 2, department: '艺术系' },  // 极水
        { id: 'crs_003', code: 'CS101', name: 'Python编程', credits: 3, department: '计算机系' }, // 正常
        { id: 'crs_004', code: 'ENG001', name: '学术英语', credits: 2, department: '外语系' }   // 波动测试
    ];

    // 4. 开课计划
    const coursePlans = [
        // 极低及格率
        { id: 'plan_001', courseId: 'crs_001', teacherId: 'tea_001', semester: '2024-2025-1', classroom: 'A101', timeSlots: '周一 1-2节' },
        // 极高优秀率
        { id: 'plan_002', courseId: 'crs_002', teacherId: 'tea_002', semester: '2024-2025-1', classroom: '大礼堂', timeSlots: '周五 7-8节' },
        // 正常
        { id: 'plan_003', courseId: 'crs_003', teacherId: 'tea_003', semester: '2024-2025-1', classroom: '机房C', timeSlots: '周三 3-4节' },
        // 波动测试
        { id: 'plan_004', courseId: 'crs_004', teacherId: 'tea_003', semester: '2024-2025-1', classroom: 'B202', timeSlots: '周二 5-6节' }
    ];

    // 5. 成绩录入
    const scores = [];

    const addScore = (planId, studentId, final, midterm = null, quiz = null, status = 'unpublished') => {
        const mid = midterm !== null ? midterm : final;
        const qz = quiz !== null ? quiz : final;
        const total = Math.round(qz * 0.2 + mid * 0.3 + final * 0.5);

        scores.push({
            id: generateId('score_'),
            coursePlanId: planId,
            studentId: studentId,
            items: { quiz: qz, midterm: mid, final: final },
            total: total,
            status: status
        });
    };

    // --- 场景1: 《理论力学》 (王灭绝) - 惨绝人寰 ---
    // 30个学生，25个挂科，最高分65
    for (let i = 1; i <= 30; i++) {
        const sid = `stu_${i.toString().padStart(3, '0')}`;
        if (i <= 25) {
            // 挂科大军 (20-58分)
            const score = Math.floor(Math.random() * 39) + 20; 
            addScore('plan_001', sid, score, score + 5, score - 5);
        } else {
            // 幸存者 (60-65分)
            const score = Math.floor(Math.random() * 6) + 60;
            addScore('plan_001', sid, score, score, score);
        }
    }

    // --- 场景2: 《影视鉴赏》 (李慈悲) - 全员通过，大量优秀 ---
    // 30个学生，28个优秀(>=90)，最低分88
    for (let i = 1; i <= 30; i++) {
        const sid = `stu_${i.toString().padStart(3, '0')}`;
        if (i <= 28) {
            // 优秀大军 (90-99分)
            const score = Math.floor(Math.random() * 10) + 90;
            addScore('plan_002', sid, score, score - 2, score + 1);
        } else {
            // 稍微低点 (85-89分)
            const score = Math.floor(Math.random() * 5) + 85;
            addScore('plan_002', sid, score, score, score);
        }
    }

    // --- 场景3: 《Python编程》 - 正常分布 ---
    for (let i = 1; i <= 30; i++) {
        const sid = `stu_${i.toString().padStart(3, '0')}`;
        // 正态分布模拟
        const score = Math.floor(Math.random() * 40) + 55; // 55-95
        addScore('plan_003', sid, score, score, score, 'published');
    }

    // --- 场景4: 《学术英语》 - 个人波动测试 ---
    // 张三 (波动王): 期中95 -> 期末40 (作弊被抓?)
    addScore('plan_004', 'stu_001', 40, 95, 90);
    
    // 李四 (逆袭王): 期中30 -> 期末85 (开窍了)
    addScore('plan_004', 'stu_002', 85, 30, 40);

    // 其他人正常
    for (let i = 3; i <= 30; i++) {
        const sid = `stu_${i.toString().padStart(3, '0')}`;
        const score = 75 + Math.floor(Math.random() * 10);
        addScore('plan_004', sid, score, score, score);
    }

    saveToStorage(STORAGE_KEYS.CLASSES, classes);
    saveToStorage(STORAGE_KEYS.USERS, users);
    saveToStorage(STORAGE_KEYS.COURSES, courses);
    saveToStorage(STORAGE_KEYS.COURSE_PLANS, coursePlans);
    saveToStorage(STORAGE_KEYS.SCORES, scores);

    console.log('EXTREME Mock data initialized.');
}

initData();
