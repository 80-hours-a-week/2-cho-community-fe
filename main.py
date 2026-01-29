from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

app = FastAPI()

# 정적 파일 마운트
app.mount("/css", StaticFiles(directory="css"), name="css")
app.mount("/js", StaticFiles(directory="js"), name="js")

# HTML 템플릿 디렉토리
templates = Jinja2Templates(directory="html")


@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("user_login.html", {"request": request})


@app.get("/main", response_class=HTMLResponse)
async def main_page(request: Request):
    return templates.TemplateResponse("post_list.html", {"request": request})


@app.get("/login", response_class=HTMLResponse)
async def login(request: Request):
    return templates.TemplateResponse("user_login.html", {"request": request})


@app.get("/signup", response_class=HTMLResponse)
async def signup(request: Request):
    return templates.TemplateResponse("user_signup.html", {"request": request})


@app.get("/password", response_class=HTMLResponse)
async def password(request: Request):
    return templates.TemplateResponse("user_password.html", {"request": request})


@app.get("/detail", response_class=HTMLResponse)
async def detail(request: Request):
    return templates.TemplateResponse("post_detail.html", {"request": request})


@app.get("/write", response_class=HTMLResponse)
async def write(request: Request):
    return templates.TemplateResponse("post_write.html", {"request": request})


@app.get("/edit", response_class=HTMLResponse)
async def edit(request: Request):
    return templates.TemplateResponse("post_edit.html", {"request": request})


@app.get("/edit-profile", response_class=HTMLResponse)
async def edit_profile(request: Request):
    return templates.TemplateResponse("user_edit.html", {"request": request})
