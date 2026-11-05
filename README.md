# Internship Tracker

面向大学生的本地实习申请追踪工具：集中记录职位、申请进度和下一步任务。

## 启动

需要 Python 3.10 或以上，无第三方依赖。在项目根目录运行：

```bash
python3 backend/server.py
```

浏览器打开 http://127.0.0.1:8000 。停止服务使用 Ctrl+C。
如果端口被占用：`python3 backend/server.py --port 8001`。

## 当前功能

- 新增、编辑、删除申请（删除前确认）。
- 记录公司、岗位、职位链接、申请日期、申请截止日期、下一步任务和备注。
- 更新待申请、已申请、笔试、面试、Offer、拒绝、撤回状态。
- 搜索公司、岗位和备注，按状态筛选，筛选有下一步任务的申请。
- 汇总全部机会、进行中申请、面试和 Offer 数量。
- SQLite 持久化；刷新页面或重启服务后保留数据。

首次运行为空列表，不预置模拟申请。数据自动写入 `data/tracker.db`，已被 Git 忽略。
备份时先停止服务，再复制该文件。

## 项目结构

```text
frontend/
  index.html       页面结构、申请表单
  styles.css       样式及窄屏布局
  app.js           页面交互、筛选、API 请求
backend/
  server.py        HTTP 接口、字段校验、SQLite 读写
tests/
  test_api.py      使用临时数据库的接口测试
data/              本地运行数据，不提交
```

请求流程：浏览器表单 → JavaScript fetch → Python JSON 接口 → SQLite → 返回结果 → 更新列表。
SQL 查询使用参数占位符；用户输入通过 DOM textContent 展示。

## API

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| GET | `/api/applications` | 获取所有申请 |
| POST | `/api/applications` | 创建申请 |
| PUT | `/api/applications/{id}` | 完整替换申请的可编辑字段 |
| DELETE | `/api/applications/{id}` | 删除申请 |

POST/PUT 接受 JSON，`company` 和 `role` 必填。字段列表参见后端 `FIELDS`。
日期格式为 `YYYY-MM-DD`；日期可留空。`deadline` 指申请截止日期，并非下一步任务的截止时间。
`created_at` 和 `updated_at` 是 UTC 时间。

## 验证

```bash
python3 -m unittest discover -s tests -v
node --check frontend/app.js
```

接口测试覆盖完整增删改查流程、数据重新打开、无效字段和来源限制；不触碰个人数据库。
手动体验：新增一条申请 → 更新状态 → 刷新 → 编辑 → 搜索/筛选 → 删除。

## 当前范围与后续计划

这是仅监听 `127.0.0.1` 的单用户本地开发版本，无登录和用户隔离，不能直接作为公网服务部署。
Python 标准库 HTTP 服务用于本地学习；上线前需要生产服务器、身份认证和用户数据隔离。
当前数据量较小时在前端筛选；后续数据量增加再实现服务端分页和搜索。

下一步按需求逐个完成：

- [ ] 为下一步任务增加截止时间和到期视图。
- [ ] 保存申请状态变更历史。
- [ ] CSV 导入导出。
- [ ] 浏览器扩展辅助保存职位。
- [ ] 多用户登录、生产部署。

参考：[Python sqlite3 文档](https://docs.python.org/3.12/library/sqlite3.html)、
[HTTP 服务的使用限制](https://docs.python.org/3/library/http.server.html)。
