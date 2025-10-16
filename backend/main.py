from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import hashlib
from datetime import datetime
import requests
from bs4 import BeautifulSoup
from typing import Optional, List
import re
from io import BytesIO
from PIL import Image
import pytesseract

app = FastAPI(title="BJTU Homework Tracker API", version="2.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class LoginRequest(BaseModel):
    student_id: str
    password: str
    use_hash: bool = False

class HomeworkFilter(BaseModel):
    finish_status: str = "unfinished"  # all, finished, unfinished
    course_keywords: List[str] = []
    ignore_expired_days: int = 15
    ignore_unexpired_days: int = 90

class Homework(BaseModel):
    id: str
    title: str
    course_name: str
    content: str
    due_time: Optional[str]
    submit_status: str
    submit_count: int
    total_count: int
    create_date: str

# Helper classes
class BJTUClient:
    BASE_URL = "http://123.121.147.7:88/ve"

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "*/*",
            "Accept-Language": "zh-CN,zh;q=0.9",
        })
        self.cookie = None
        self.sessionid = None

    def login(self, student_id: str, password: str, use_hash: bool = False):
        """Login to BJTU course platform"""
        # Get main page first
        self.session.get(f"{self.BASE_URL}/")

        # Get captcha
        try:
            captcha_response = self.session.get(f"{self.BASE_URL}/GetImg")
            image = Image.open(BytesIO(captcha_response.content))
            passcode = pytesseract.image_to_string(image)
            passcode = re.sub(r'[^0-9]', '', passcode)
        except Exception as e:
            # If OCR fails, try without captcha or use empty string
            passcode = ""

        # Prepare password
        if use_hash:
            password_hash = password
        else:
            if not password:
                password = f"Bjtu@{student_id}"
            password_hash = hashlib.md5(password.encode()).hexdigest()

        # Login
        login_data = {
            'login': 'main_2',
            'qxkt_type': '',
            'qxkt_url': '',
            'username': student_id,
            'password': password_hash,
            'passcode': passcode
        }

        response = self.session.post(
            f"{self.BASE_URL}/s.shtml",
            data=login_data,
            allow_redirects=True
        )

        if not (200 <= response.status_code < 300) or 'alert(' in response.text:
            raise HTTPException(status_code=401, detail="Login failed")

        self.cookie = self.session.cookies.get_dict()
        return self.cookie

    def _request_get(self, url: str, referer: str = None) -> dict:
        """Make GET request with proper headers"""
        headers = {
            "Cookie": f"JSESSIONID={self.cookie['JSESSIONID']}",
            "X-Requested-With": "XMLHttpRequest",
            "Host": "123.121.147.7:88"
        }
        if referer:
            headers["Referer"] = referer
        if self.sessionid:
            headers["sessionId"] = self.sessionid

        response = self.session.get(url, headers=headers)
        return response.json()

    def get_current_semester(self) -> str:
        """Get current semester code"""
        url = f"{self.BASE_URL}/back/rp/common/teachCalendar.shtml?method=queryCurrentXq"
        response = self._request_get(url)
        return response["result"][0]["xqCode"]

    def get_session_id(self) -> str:
        """Get session ID"""
        url = f"{self.BASE_URL}/back/coursePlatform/message.shtml?method=getArticleList"
        referer = f"{self.BASE_URL}/back/coursePlatform/coursePlatform.shtml?method=toCoursePlatformIndex"
        response = self._request_get(url, referer=referer)
        return response.get("sessionId", "")

    def get_courses(self, semester: str) -> List[dict]:
        """Get course list"""
        url = f"{self.BASE_URL}/back/coursePlatform/course.shtml?method=getCourseList&pagesize=100&page=1&xqCode={semester}"
        referer = f"{self.BASE_URL}/back/coursePlatform/coursePlatform.shtml?method=toCoursePlatformIndex"
        response = self._request_get(url, referer=referer)
        return response.get("courseList", [])

    def get_homework_for_course(self, course: dict, semester: str) -> List[dict]:
        """Get homework for a specific course"""
        homework_list = []
        base_url = f"{self.BASE_URL}/back/coursePlatform/homeWork.shtml"

        # Three types: 0=homework, 1=report, 2=experiment
        for homework_type in range(3):
            url = f"{base_url}?method=getHomeWorkList&cId={course['id']}&subType={homework_type}&page=1&pagesize=100"

            referer = (
                f"{self.BASE_URL}/back/coursePlatform/coursePlatform.shtml?"
                f"method=toCoursePlatform&courseId={course['course_num']}&"
                f"dataSource=1&cId={course['id']}&xkhId={course['fz_id']}&"
                f"xqCode={semester}&teacherId={course['teacher_id']}"
            )

            try:
                response = self._request_get(url, referer=referer)
                if response.get('message') != '没有数据':
                    homeworks = response.get("courseNoteList", [])
                    for hw in homeworks:
                        hw['course_name'] = course['name']
                    homework_list.extend(homeworks)
            except:
                continue

        return homework_list

# API endpoints
@app.get("/")
async def root():
    return {
        "message": "BJTU Homework Tracker API v2.0",
        "status": "running"
    }

@app.post("/api/homework")
async def get_homework(login: LoginRequest, filters: HomeworkFilter = HomeworkFilter()):
    """Get homework list with filters"""
    try:
        client = BJTUClient()

        # Login
        client.login(login.student_id, login.password, login.use_hash)

        # Get semester and session
        semester = client.get_current_semester()
        client.sessionid = client.get_session_id()

        # Get courses
        courses = client.get_courses(semester)

        # Get all homework
        all_homework = []
        for course in courses:
            homework_list = client.get_homework_for_course(course, semester)
            all_homework.extend(homework_list)

        # Apply filters
        filtered_homework = []
        for hw in all_homework:
            # Filter by status
            if filters.finish_status == "finished" and hw.get("subStatus") != "已提交":
                continue
            elif filters.finish_status == "unfinished" and hw.get("subStatus") != "未提交":
                continue

            # Filter by keywords
            if filters.course_keywords:
                if not any(kw in hw.get('course_name', '') for kw in filters.course_keywords):
                    continue

            # Filter by due date
            end_time = hw.get("end_time")
            if end_time:
                try:
                    due_date = datetime.strptime(end_time, "%Y-%m-%d %H:%M")
                    today = datetime.now()

                    # Skip if expired too long ago
                    if due_date < today and (today - due_date).days > filters.ignore_expired_days:
                        continue

                    # Skip if due too far in future
                    if due_date > today and (due_date - today).days > filters.ignore_unexpired_days:
                        continue
                except:
                    pass

            # Clean content
            content_text = BeautifulSoup(hw.get('content', ''), 'html.parser').get_text()

            filtered_homework.append({
                "id": str(hw.get('id', '')),
                "title": hw.get('title', ''),
                "course_name": hw.get('course_name', ''),
                "content": content_text or '无详情',
                "due_time": hw.get('end_time'),
                "submit_status": hw.get('subStatus', ''),
                "submit_count": hw.get('submitCount', 0),
                "total_count": hw.get('allCount', 0),
                "create_date": hw.get('open_date', '')
            })

        return {
            "success": True,
            "data": filtered_homework,
            "total": len(filtered_homework),
            "semester": semester
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
