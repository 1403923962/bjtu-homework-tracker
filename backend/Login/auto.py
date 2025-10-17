"""
自动化登录类 - 使用Playwright和ddddocr OCR
"""
import logging
import subprocess
import json
import re
import time
from Login.abstract import LoginMethod

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AutoLogin(LoginMethod):
    """
    使用Playwright自动化浏览器登录
    配合ddddocr进行验证码识别
    """

    def __init__(self):
        self.cookie = dict()

    def ocr_captcha(self, captcha_path: str) -> str:
        """
        使用ddddocr识别验证码
        :param captcha_path: 验证码图片路径
        :return: 识别结果
        """
        try:
            import ddddocr
            ocr = ddddocr.DdddOcr()
            with open(captcha_path, 'rb') as f:
                img_bytes = f.read()
                result = ocr.classification(img_bytes)
                logger.info(f"OCR识别结果: {result}")

                # 处理数学表达式，比如 "5X8=" -> 40
                result = result.strip()
                if '=' in result:
                    expr = result.replace('=', '').strip()
                    # 替换X为*
                    expr = expr.replace('X', '*').replace('x', '*')
                    # 移除空格
                    expr = expr.replace(' ', '')
                    try:
                        answer = eval(expr)
                        logger.info(f"计算结果: {expr} = {answer}")
                        return str(int(answer))
                    except:
                        logger.warning(f"无法计算表达式: {expr}")
                        return result
                return result
        except ImportError:
            logger.error("ddddocr未安装，请运行: pip install ddddocr")
            raise
        except Exception as e:
            logger.error(f"OCR识别失败: {e}")
            raise

    def login_with_playwright(self, student_id: str, password: str) -> dict:
        """
        使用Playwright自动化登录流程
        """
        try:
            from playwright.sync_api import sync_playwright
        except ImportError:
            logger.error("playwright未安装，请运行: pip install playwright && playwright install chromium")
            raise

        login_url = "https://cas.bjtu.edu.cn"
        target_url = "https://bksy.bjtu.edu.cn/login_introduce_s.html"

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context()
            page = context.new_page()

            try:
                # 访问登录页面
                logger.info(f"访问登录页面: {login_url}")
                page.goto(login_url, wait_until='networkidle')
                time.sleep(1)

                # 填写用户名
                logger.info(f"填写用户名: {student_id}")
                page.fill('#id_loginname', student_id)

                # 填写密码
                logger.info("填写密码")
                page.fill('#id_password', password)

                # 下载验证码
                logger.info("下载验证码图片")
                captcha_element = page.locator('#id_captcha_1_img')
                captcha_element.screenshot(path='captcha_temp.png')

                # OCR识别验证码
                logger.info("OCR识别验证码")
                captcha_answer = self.ocr_captcha('captcha_temp.png')
                logger.info(f"验证码答案: {captcha_answer}")

                # 填写验证码
                page.fill('#id_captcha_1', captcha_answer)

                # 提交登录
                logger.info("提交登录表单")
                page.click('button[type="submit"]')

                # 等待跳转
                time.sleep(3)

                # 检查是否登录成功（通过URL判断）
                current_url = page.url
                logger.info(f"当前URL: {current_url}")

                if 'cas.bjtu.edu.cn' in current_url and 'login' in current_url:
                    # 还在登录页面，可能是验证码错误或密码错误
                    logger.error("登录失败，可能是验证码或密码错误")
                    raise Exception("登录失败")

                # 导航到目标页面获取cookie
                logger.info(f"导航到目标页面: {target_url}")
                page.goto(target_url, wait_until='networkidle')
                time.sleep(2)

                # 获取cookies
                cookies = context.cookies()
                logger.info(f"获取到 {len(cookies)} 个cookies")

                # 提取JSESSIONID
                jsessionid = None
                for cookie in cookies:
                    if cookie['name'] == 'JSESSIONID':
                        jsessionid = cookie['value']
                        break

                if jsessionid:
                    logger.info(f"成功获取JSESSIONID: {jsessionid[:20]}...")
                    return {'JSESSIONID': jsessionid}
                else:
                    logger.error("未找到JSESSIONID cookie")
                    # 打印所有cookie名称用于调试
                    cookie_names = [c['name'] for c in cookies]
                    logger.info(f"可用的cookies: {cookie_names}")
                    raise Exception("未找到JSESSIONID")

            finally:
                browser.close()

    def login(self, student_id: str = None, password: str = None):
        """
        登录入口
        :param student_id: 学号
        :param password: 密码（明文）
        """
        if not student_id or not password:
            raise ValueError("学号和密码不能为空")

        logger.info(f"开始自动化登录，学号: {student_id}")

        try:
            self.cookie = self.login_with_playwright(student_id, password)
            logger.info("登录成功！")
        except Exception as e:
            logger.error(f"登录失败: {e}")
            raise

    def getCookies(self) -> dict:
        """返回cookie字典"""
        return self.cookie
