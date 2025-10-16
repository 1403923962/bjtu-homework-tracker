# BJTU 课程平台核心 API 逻辑提取

本文档详细记录了从原项目中提取的北京交通大学智慧课程平台的核心API逻辑。

## 🔐 登录流程

### 基础URL
```
http://123.121.147.7:88/ve
```

### 登录步骤

1. **访问主页**
   ```
   GET http://123.121.147.7:88/ve/
   ```
   - 获取初始会话

2. **获取验证码**
   ```
   GET http://123.121.147.7:88/ve/GetImg
   ```
   - 返回验证码图片
   - 使用 Tesseract OCR 识别
   - 正则表达式提取数字：`r'[^0-9]'`

3. **提交登录**
   ```
   POST http://123.121.147.7:88/ve/s.shtml
   ```

   **请求体：**
   ```python
   {
       'login': 'main_2',
       'qxkt_type': '',
       'qxkt_url': '',
       'username': student_id,
       'password': password_md5,  # MD5加密
       'passcode': captcha
   }
   ```

   **密码规则：**
   - 默认密码：`Bjtu@{student_id}`
   - 需要 MD5 加密
   - 支持自定义密码

4. **获取 Cookie**
   - 登录成功后获取 `JSESSIONID`
   - 后续请求都需要携带此 Cookie

## 📚 数据获取流程

### 通用请求头

```python
{
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "*/*",
    "Accept-Encoding": "gzip, deflate",
    "Accept-Language": "zh-CN,zh;q=0.9",
    "Connection": "keep-alive",
    "Host": "123.121.147.7:88",
    "X-Requested-With": "XMLHttpRequest",
    "Cookie": f"JSESSIONID={cookie['JSESSIONID']}",
    "sessionId": session_id  # 在获取后需要携带
}
```

### 1. 获取当前学期

```
GET http://123.121.147.7:88/ve/back/rp/common/teachCalendar.shtml?method=queryCurrentXq
```

**Referer:**
```
http://123.121.147.7:88/ve/back/rp/common/teachCalendar.shtml?method=queryCurrentXq
```

**响应示例：**
```json
{
    "result": [
        {
            "xqCode": "2025202501"  // 学期代码
        }
    ]
}
```

### 2. 获取 SessionID

```
GET http://123.121.147.7:88/ve/back/coursePlatform/message.shtml?method=getArticleList
```

**Referer:**
```
http://123.121.147.7:88/ve/back/coursePlatform/coursePlatform.shtml?method=toCoursePlatformIndex
```

**响应示例：**
```json
{
    "sessionId": "abc123..."
}
```

### 3. 获取课程列表

```
GET http://123.121.147.7:88/ve/back/coursePlatform/course.shtml?method=getCourseList&pagesize=100&page=1&xqCode={学期代码}
```

**Referer:**
```
http://123.121.147.7:88/ve/back/coursePlatform/coursePlatform.shtml?method=toCoursePlatformIndex
```

**响应示例：**
```json
{
    "courseList": [
        {
            "id": "课程ID",
            "name": "课程名称",
            "course_num": "课程代码",
            "teacher_name": "教师姓名",
            "teacher_id": "教师ID",
            "fz_id": "分组ID",
            "xq_code": "学期代码"
        }
    ]
}
```

### 4. 获取作业列表

对每门课程，需要查询三种类型的作业：

```
GET http://123.121.147.7:88/ve/back/coursePlatform/homeWork.shtml?method=getHomeWorkList&cId={课程ID}&subType={作业类型}&page=1&pagesize=100
```

**作业类型：**
- `0` - 作业
- `1` - 课程报告
- `2` - 实验

**Referer 模板：**
```
http://123.121.147.7:88/ve/back/coursePlatform/coursePlatform.shtml?method=toCoursePlatform&courseToPage={页面ID}&courseId={课程代码}&dataSource=1&cId={课程ID}&xkhId={分组ID}&xqCode={学期代码}&teacherId={教师ID}
```

**页面ID映射：**
- 作业 (type=0) → pageId=10460
- 课程报告 (type=1) → pageId=10461
- 实验 (type=2) → pageId=10462

**响应示例：**
```json
{
    "message": "success",  // 或 "没有数据"
    "courseNoteList": [
        {
            "id": "作业ID",
            "title": "作业标题",
            "content": "<p>作业内容HTML</p>",
            "course_name": "课程名称",
            "end_time": "2025-10-20 23:59",
            "open_date": "2025-10-01",
            "subStatus": "未提交",  // 或 "已提交"
            "submitCount": 10,
            "allCount": 50
        }
    ]
}
```

## 🎯 数据筛选逻辑

### 1. 按完成状态筛选

```python
def filter_finish_status(finish_status: str, homework: dict) -> bool:
    if finish_status == "all":
        return True
    elif finish_status == "finished":
        return homework["subStatus"] == "已提交"
    elif finish_status == "unfinished":
        return homework["subStatus"] == "未提交"
```

### 2. 按课程关键词筛选

```python
def filter_course_keyword(positive_keywords: list, negative_keywords: list, homework: dict) -> bool:
    # 白名单：必须包含所有关键词
    for keyword in positive_keywords:
        if keyword not in homework["course_name"]:
            return False

    # 黑名单：不能包含任何关键词
    for keyword in negative_keywords:
        if keyword in homework["course_name"]:
            return False

    return True
```

### 3. 按时间筛选

```python
from datetime import datetime, timedelta

def filter_expired(ignore_expired_n_days: int, ignore_unexpired_n_days: int, homework: dict) -> bool:
    end_time_str = homework.get("end_time", "")

    # 没有截止时间的作业保留
    if not end_time_str:
        return True

    end_date = datetime.strptime(homework["end_time"], "%Y-%m-%d %H:%M")
    today = datetime.today()

    # 过滤过期太久的作业
    if end_date < today - timedelta(days=ignore_expired_n_days):
        return False

    # 过滤截止太远的作业
    if end_date > today + timedelta(days=ignore_unexpired_n_days):
        return False

    return True
```

## 📊 数据处理

### HTML 内容清理

作业内容通常是 HTML 格式，需要提取纯文本：

```python
from bs4 import BeautifulSoup

def clean_content(html_content: str) -> str:
    soup = BeautifulSoup(html_content, 'html.parser')
    plain_text = soup.get_text()
    return plain_text or '无详情'
```

### 时间格式

- 输入格式：`"2025-10-20 23:59"`
- Python 解析：`datetime.strptime(time_str, "%Y-%m-%d %H:%M")`

## 🔄 完整流程图

```
1. 访问主页
    ↓
2. 获取验证码并识别
    ↓
3. 提交登录信息
    ↓
4. 获取 JSESSIONID Cookie
    ↓
5. 获取当前学期代码
    ↓
6. 获取 SessionID
    ↓
7. 获取课程列表
    ↓
8. 遍历每门课程
    ↓
9. 对每门课程查询三种类型作业
    ↓
10. 合并所有作业
    ↓
11. 应用筛选条件
    ↓
12. 返回结果
```

## ⚙️ 配置参数

### 默认筛选参数

```python
{
    'course_positive_keyword': [],      # 课程白名单
    'course_negative_keyword': [],      # 课程黑名单
    'finish_status': 'unfinished',      # 完成状态
    'ignore_expired_n_days': 15,        # 忽略过期超过15天的作业
    'ignore_unexpired_n_days': 90       # 忽略截止超过90天的作业
}
```

## 🛡️ 注意事项

1. **Cookie 生命周期**
   - Cookie 可能会过期
   - 需要处理登录失效的情况

2. **验证码识别**
   - OCR 识别可能失败
   - 需要处理识别错误的情况
   - 可以考虑多次重试

3. **网络请求**
   - 需要设置合理的超时时间
   - 处理网络异常

4. **数据清洗**
   - HTML 内容需要清理
   - 特殊字符处理
   - 空值处理

5. **并发控制**
   - 避免请求过于频繁
   - 考虑添加请求间隔

## 📝 示例代码

完整的实现请参考 `backend/main.py` 中的 `BJTUClient` 类。

## 🔗 相关链接

- 原项目：https://github.com/ymzhang-cs/BJTU-Homework-Tracker
- BJTU 智慧课程平台：http://123.121.147.7:88/ve/
