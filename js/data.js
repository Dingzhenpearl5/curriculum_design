/**
 * 数据管理模块 (IndexedDB 版)
 * 负责 IndexedDB 的读写和初始化模拟数据
 */

const DB_CONFIG = {
    name: 'CurriculumDesignDB',
    version: 1,
    stores: {
        users: { keyPath: 'id' },
        classes: { keyPath: 'id' },
        courses: { keyPath: 'id' },
        plans: { keyPath: 'id' },
        scores: { keyPath: 'id' }
    }
};

const STORAGE_KEYS = {
    USERS: 'users',
    CLASSES: 'classes',
    COURSES: 'courses',
    COURSE_PLANS: 'plans',
    SCORES: 'scores',
    DATA_VERSION: 'cms_data_v7_avatar' // 升级版本号
};

// 默认头像 (SVG Base64)
const DEFAULT_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMjggMTI4Ij48Y2lyY2xlIGN4PSI2NCIgY3k9IjY0IiByPSI2NCIgZmlsbD0iI2UzZTNUzIiLz48cGF0aCBkPSJNNjQgMzJhMjQgMjQgMCAxIDAgMCA0OCAyNCAyNCAwIDAgMCAwLTQ4em0tNDAgODBhNDAgNDAgMCAwIDEgODAgMHY4SDI0di04eiIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==';

class DB {
    constructor() {
        this.db = null;
    }

    async open() {
        if (this.db) return this.db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);

            request.onerror = (event) => {
                console.error("Database error: " + event.target.errorCode);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                for (const [name, config] of Object.entries(DB_CONFIG.stores)) {
                    if (!db.objectStoreNames.contains(name)) {
                        db.createObjectStore(name, config);
                    }
                }
            };
        });
    }

    async getAll(storeName) {
        await this.open();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], "readonly");
            const objectStore = transaction.objectStore(storeName);
            const request = objectStore.getAll();

            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async add(storeName, item) {
        await this.open();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], "readwrite");
            const objectStore = transaction.objectStore(storeName);
            const request = objectStore.add(item);

            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async put(storeName, item) {
        await this.open();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], "readwrite");
            const objectStore = transaction.objectStore(storeName);
            const request = objectStore.put(item);

            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async delete(storeName, id) {
        await this.open();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], "readwrite");
            const objectStore = transaction.objectStore(storeName);
            const request = objectStore.delete(id);

            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }
    
    async clear(storeName) {
        await this.open();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], "readwrite");
            const objectStore = transaction.objectStore(storeName);
            const request = objectStore.clear();

            request.onsuccess = (event) => resolve();
            request.onerror = (event) => reject(event.target.error);
        });
    }
}

const db = new DB();

function generateId(prefix = '') {
    return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

async function initData() {
    // Check if data initialized using localStorage flag (simple way to persist state across reloads)
    if (localStorage.getItem(STORAGE_KEYS.DATA_VERSION) === 'true') {
        return;
    }

    console.log('Initializing EXTREME mock data into IndexedDB...');
    
    // Clear existing data
    await db.open();
    for (const store of Object.keys(DB_CONFIG.stores)) {
        await db.clear(store);
    }

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
        
        const gender = Math.random() > 0.5 ? 'male' : 'female';
        const regions = ['beijing', 'shanghai', 'guangdong', 'zhejiang', 'jiangsu'];
        const region = regions[Math.floor(Math.random() * regions.length)];
        const phone = `138${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}8888`;
        const birthday = `200${Math.floor(Math.random() * 4)}-${Math.floor(Math.random() * 12 + 1).toString().padStart(2, '0')}-${Math.floor(Math.random() * 28 + 1).toString().padStart(2, '0')}`;

        users.push({
            id: `stu_${i.toString().padStart(3, '0')}`,
            username: `2021${i.toString().padStart(3, '0')}`,
            name: name,
            role: 'student',
            classId: i <= 10 ? 'cls_001' : (i <= 20 ? 'cls_002' : 'cls_003'),
            gender: gender,
            email: `student${i}@example.com`,
            phone: phone,
            birthday: birthday,
            region: region,
            avatar: DEFAULT_AVATAR // 默认头像
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
            quiz: qz,       // Flattened
            midterm: mid,   // Flattened
            final: final,   // Flattened
            total: total,
            status: status
        });
    };

    // --- 场景1: 《理论力学》 (王灭绝) - 惨绝人寰 ---
    for (let i = 1; i <= 30; i++) {
        const sid = `stu_${i.toString().padStart(3, '0')}`;
        if (i <= 25) {
            const score = Math.floor(Math.random() * 39) + 20; 
            addScore('plan_001', sid, score, score + 5, score - 5);
        } else {
            const score = Math.floor(Math.random() * 6) + 60;
            addScore('plan_001', sid, score, score, score);
        }
    }

    // --- 场景2: 《影视鉴赏》 (李慈悲) - 全员通过，大量优秀 ---
    for (let i = 1; i <= 30; i++) {
        const sid = `stu_${i.toString().padStart(3, '0')}`;
        if (i <= 28) {
            const score = Math.floor(Math.random() * 10) + 90;
            addScore('plan_002', sid, score, score - 2, score + 1);
        } else {
            const score = Math.floor(Math.random() * 5) + 85;
            addScore('plan_002', sid, score, score, score);
        }
    }

    // --- 场景3: 《Python编程》 - 正常分布 ---
    for (let i = 1; i <= 30; i++) {
        const sid = `stu_${i.toString().padStart(3, '0')}`;
        const score = Math.floor(Math.random() * 40) + 55; 
        addScore('plan_003', sid, score, score, score, 'published');
    }

    // --- 场景4: 《学术英语》 - 个人波动测试 ---
    addScore('plan_004', 'stu_001', 40, 95, 90);
    addScore('plan_004', 'stu_002', 85, 30, 40);
    for (let i = 3; i <= 30; i++) {
        const sid = `stu_${i.toString().padStart(3, '0')}`;
        const score = 75 + Math.floor(Math.random() * 10);
        addScore('plan_004', sid, score, score, score);
    }

    // 批量写入 IndexedDB
    const promises = [
        ...classes.map(i => db.put(STORAGE_KEYS.CLASSES, i)),
        ...users.map(i => db.put(STORAGE_KEYS.USERS, i)),
        ...courses.map(i => db.put(STORAGE_KEYS.COURSES, i)),
        ...coursePlans.map(i => db.put(STORAGE_KEYS.COURSE_PLANS, i)),
        ...scores.map(i => db.put(STORAGE_KEYS.SCORES, i))
    ];

    await Promise.all(promises);
    localStorage.setItem(STORAGE_KEYS.DATA_VERSION, 'true');
    console.log('EXTREME Mock data initialized in IndexedDB.');
}

// 自动初始化
initData();
