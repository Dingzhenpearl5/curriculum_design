# 教学管理系统 (Curriculum Design)

这是一个基于原生 JavaScript 和 Bootstrap 5 开发的轻量级教学管理模块。系统采用单页应用 (SPA) 设计模式，主要面向教学管理员，提供全方位的教务管理功能。数据完全存储在浏览器端的 IndexedDB 中。
功能特性

### 1. 仪表盘 (Dashboard)
*   直观的卡片式导航，快速进入各个功能模块。

### 2. 学生管理 (Student Management)
*   **列表展示**: 支持分页（滚动）、按学号/姓名搜索。
*   **个人中心**: 
    *   全屏式个人档案编辑页面。
    *   **头像管理**: 支持本地图片上传、预览及圆形裁剪显示。
    *   **内联编辑**: 点击邮箱或手机号即可直接修改，体验流畅。
    *   **详细信息**: 涵盖性别、生日、地区、所属班级等完整信息。

### 3. 班级与教师管理
*   **班级管理**: 行政班级的增删改查。
*   **教师管理**: 教师基础信息的维护。

### 4. 课程与排课
*   **课程库**: 管理课程代码、名称、学分及归属院系。
*   **开课计划**: 制定学期教学计划，关联课程、教师、上课时间及地点。

### 5. 成绩管理
*   **成绩审核**: 查看各教学班的成绩单。
*   **数据导出**: 支持将成绩数据导出为 CSV 文件。
*   **多维成绩**: 包含平时、期中、期末及总评成绩。

## 项目结构

```text
curriculum_design/
├── admin.html          # 系统主入口 (包含所有视图模板)
├── js/
│   ├── admin.js        # 业务逻辑层 (UI控制、事件绑定、DOM操作)
│   └── data.js         # 数据持久层 (IndexedDB封装、Mock数据生成)
└── README.md           # 项目说明文档
```

## 数据库说明

系统使用 **IndexedDB** 进行本地数据持久化，数据库名为 `CurriculumDesignDB`。

### 1. 用户表 (`users`)
存储学生、教师和管理员信息。
*   `id`: 主键 (如 `stu_001`)
*   `username`: 学号/工号
*   `name`: 姓名
*   `role`: 角色 (`student`, `teacher`, `admin`)
*   `classId`: 班级ID (仅学生)
*   `avatar`: 头像 (Base64)
*   `gender`, `phone`, `email`, `birthday`, `region`: 个人信息

### 2. 班级表 (`classes`)
存储行政班级。
*   `id`: 主键
*   `name`: 班级名称

### 3. 课程表 (`courses`)
存储课程基础信息。
*   `id`: 主键
*   `code`: 课程代码
*   `name`: 课程名称
*   `credits`: 学分
*   `department`: 开课院系

### 4. 开课计划表 (`plans`)
存储学期排课信息。
*   `id`: 主键
*   `courseId`: 关联课程ID
*   `teacherId`: 关联教师ID
*   `semester`: 学期 (如 `2024-2025-1`)
*   `classroom`: 教室
*   `timeSlots`: 上课时间 (格式: `周一,周三 1,2节`)
*   `weekType`: **[新增]** 周数类型 (`all`:每周, `odd`:单周, `even`:双周)
*   `maxStudents`: **[新增]** 最大选课人数

### 5. 成绩表 (`scores`)
存储学生成绩。
*   `id`: 主键
*   `coursePlanId`: 关联开课计划ID
*   `studentId`: 关联学生ID
*   `quiz`, `midterm`, `final`: 平时/期中/期末成绩
*   `total`: 总评成绩
*   `status`: 状态 (`published`, `unpublished`)

*最后更新时间: 2025-12-15*
