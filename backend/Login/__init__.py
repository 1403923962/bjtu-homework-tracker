from Login.abstract import LoginMethod
from Login.cookie import Cookie
from Login.config import Config
from Login.auto import AutoLogin

class Login:
    """
    登录类，支持通过cookie登录或通过MIS登录
    """
    def __init__(self, method: str = None) -> None:
        self.cookie = None
        # 延迟导入，避免不必要的依赖
        self._method_classes = {
            "cookie": Cookie,
            "auto": AutoLogin
        }
        if method is not None:
            if method == "mis":
                from Login.mis import Mis
                self.method = Mis()
            elif method == "cp":
                from Login.cp import CoursePlatform
                self.method = CoursePlatform()
            else:
                method_class = self._method_classes.get(method)
                if method_class:
                    self.method = method_class()
                else:
                    raise ValueError(f"Unknown login method: {method}")
        else:
            self.method = None

    @property
    def enabled_methods(self):
        """动态获取可用的登录方式"""
        methods = {"cookie": Cookie, "auto": AutoLogin}
        try:
            from Login.mis import Mis
            methods["mis"] = Mis
        except ImportError:
            pass
        try:
            from Login.cp import CoursePlatform
            methods["cp"] = CoursePlatform
        except ImportError:
            pass
        return methods

    def show_methods(self) -> None:
        print("支持的登录方式：")
        for i, method in enumerate(self.enabled_methods.keys()):
            print(f"{i + 1}. {method}")

    def set_method(self, method: str) -> None:
        self.method = self.enabled_methods.get(method, None)()

    def user_select_method(self) -> None:
        self.show_methods()
        method = int(input("请选择登录方式：\n"))
        if method < 1 or method > len(self.enabled_methods):
            print("输入错误")
            return
        self.method = list(self.enabled_methods.values())[method - 1]()

    def login(self, **kwargs) -> None:
        """
        登录
        :return:
        """
        if self.method is None:
            raise Exception("未设置登录方式")
        # if type(self.method) == Mis:
        #     #在这里选择浏览器
        #     browser = ""
        #     if GLOBAL_CONFIG['use_config_workflows']:
        #         browser = GLOBAL_CONFIG['login']['mis']['browser']
        #     else:   
        #         print("请选择你的浏览器")
        #         print("1. Chrome")
        #         print("2. Edge")
        #         browser_choice = int(input().strip())
        #         if browser_choice == 1:
        #             browser = 'chrome'
        #         elif browser_choice == 2:
        #             browser = 'edge'
        #         else:
        #             raise ValueError("请选择1或者2")

        #     kwargs['browser'] = browser
        self.method.login(**kwargs)
        self.cookie = self.method.getCookies()
