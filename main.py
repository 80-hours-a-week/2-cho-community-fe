from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI()

# 정적 파일 마운트
app.mount("/css", StaticFiles(directory="css"), name="css")
app.mount("/js", StaticFiles(directory="js"), name="js")


@app.get("/")
async def read_root():
    return FileResponse("html/user_login.html")


@app.get("/main")
async def main_page():
    return FileResponse("html/post_list.html")


@app.get("/login")
async def login():
    return FileResponse("html/user_login.html")


@app.get("/signup")
async def signup():
    return FileResponse("html/user_signup.html")


@app.get("/password")
async def password():
    return FileResponse("html/user_password.html")


@app.get("/detail")
async def detail():
    return FileResponse("html/post_detail.html")


@app.get("/write")
async def write():
    return FileResponse("html/post_write.html")


@app.get("/edit")
async def edit():
    return FileResponse("html/post_edit.html")


@app.get("/edit-profile")
async def edit_profile():
    return FileResponse("html/user_edit.html")
