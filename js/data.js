/**
 * 数据管理模块
 * 负责 LocalStorage 的读写和初始化模拟数据
 */

// 存储键名常量
const STORAGE_KEYS = {
    USERS: 'cms_users',
    CLASSES: 'cms_classes',
    COURSES: 'cms_courses',
    COURSE_PLANS: 'cms_course_plans',
    ENROLLMENTS: 'cms_enrollments',
    SCORES: 'cms_scores'
};

/**
 * 工具函数：生成唯一ID
 * 使用时间戳 + 随机数
 */
function generateId(prefix = '') {
    return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * 工具函数：保存数据到 LocalStorage
 * @param {string} key 
 * @param {any} data 
 */
function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error('Error saving to localStorage', e);
        alert('存储空间不足或写入失败！');
    }
}

/**
 * 工具函数：从 LocalStorage 读取数据
 * @param {string} key 
 * @returns {any} 解析后的数据或 null
 */
function loadFromStorage(key) {
    const data = localStorage.getItem(key);
    try {
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error('Error parsing data from localStorage', e);
        return null;
    }
}

/**
 * 初始化函数：检查并预置模拟数据
 */
function initData() {
    // 检查是否已有用户数据，如果没有则认为需要初始化
    if (loadFromStorage(STORAGE_KEYS.USERS)) {
        console.log('Data already exists. Skipping initialization.');
        return;
    }

    console.log('Initializing mock data...');

    // 1. 班级数据 (Classes)
    const classes = [
        { id: 'cls_001', name: '计算机科学与技术2101班' },
        { id: 'cls_002', name: '软件工程2101班' },
        { id: 'cls_003', name: '网络工程2101班' }
    ];

    // 2. 用户数据 (Users)
    const users = [
        // 管理员
        { id: 'admin_001', username: 'admin', name: '系统管理员', role: 'admin' },
        // 教师
        { id: 'tea_001', username: 'wanglaoshi', name: '王老师', role: 'teacher' },
        { id: 'tea_002', username: 'lilaoshi', name: '李老师', role: 'teacher' },
        { id: 'tea_003', username: 'zhanglaoshi', name: '张老师', role: 'teacher' },
        // 学生
        { id: 'stu_001', username: 'zhangsan', name: '张三', role: 'student', classId: 'cls_001' },
        { id: 'stu_002', username: 'lisi', name: '李四', role: 'student', classId: 'cls_001' },
        { id: 'stu_003', username: 'wangwu', name: '王五', role: 'student', classId: 'cls_002' },
        { id: 'stu_004', username: 'zhaoliu', name: '赵六', role: 'student', classId: 'cls_002' },
        { id: 'stu_005', username: 'qianqi', name: '钱七', role: 'student', classId: 'cls_003' }
    ];

    // 3. 课程数据 (Courses)
    const courses = [
        { id: 'crs_001', code: 'CS101', name: '数据结构', credits: 4, department: '计算机学院' },
        { id: 'crs_002', code: 'CS102', name: '操作系统', credits: 3, department: '计算机学院' },
        { id: 'crs_003', code: 'CS103', name: '计算机网络', credits: 3, department: '计算机学院' },
        { id: 'crs_004', code: 'CS104', name: '数据库原理', credits: 4, department: '计算机学院' },
        { id: 'crs_005', code: 'SE101', name: 'Java程序设计', credits: 2, department: '软件学院' }
    ];

    // 4. 开课计划 (Course Plans)
    const coursePlans = [
        { id: 'plan_001', courseId: 'crs_001', teacherId: 'tea_001', semester: '2024-2025-1', classroom: 'A101', timeSlots: '周一 1-2节' },
        { id: 'plan_002', courseId: 'crs_002', teacherId: 'tea_002', semester: '2024-2025-1', classroom: 'B202', timeSlots: '周二 3-4节' },
        { id: 'plan_003', courseId: 'crs_005', teacherId: 'tea_003', semester: '2024-2025-1', classroom: 'C303', timeSlots: '周三 5-6节' }
    ];

    // 5. 选课记录 (Enrollments)
    const enrollments = [
        { studentId: 'stu_001', coursePlanId: 'plan_001' }, // 张三选数据结构
        { studentId: 'stu_002', coursePlanId: 'plan_001' }, // 李四选数据结构
        { studentId: 'stu_003', coursePlanId: 'plan_002' }, // 王五选操作系统
        { studentId: 'stu_001', coursePlanId: 'plan_003' }  // 张三选Java
    ];

    // 6. 成绩记录 (Scores)
    const scores = [
        { 
            studentId: 'stu_001', 
            coursePlanId: 'plan_001', 
            items: { homework1: 85, homework2: 90, final: 88 }, 
            total: 88, 
            gpa: 3.7, 
            status: 'published' 
        },
        { 
            studentId: 'stu_002', 
            coursePlanId: 'plan_001', 
            items: { homework1: 70, homework2: 75, final: 60 }, 
            total: 65, 
            gpa: 1.5, 
            status: 'published' 
        }
    ];

    // 保存所有数据
    saveToStorage(STORAGE_KEYS.CLASSES, classes);
    saveToStorage(STORAGE_KEYS.USERS, users);
    saveToStorage(STORAGE_KEYS.COURSES, courses);
    saveToStorage(STORAGE_KEYS.COURSE_PLANS, coursePlans);
    saveToStorage(STORAGE_KEYS.ENROLLMENTS, enrollments);
    saveToStorage(STORAGE_KEYS.SCORES, scores);

    console.log('Mock data initialized successfully.');
}

// 自动执行初始化
initData();
