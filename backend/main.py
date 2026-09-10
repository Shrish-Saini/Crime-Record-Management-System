from fastapi import FastAPI
from sqlalchemy import text

from database import engine
from routes.cases import router as cases_router


app = FastAPI(
    title="Crime Record Management System API",
    description="Backend API for the CRMS DBMS project",
    version="1.0.0"
)


app.include_router(cases_router)


@app.get("/")
def root():
    return {
        "message": "Crime Record Management System API is running"
    }


@app.get("/test-db")
def test_db():
    with engine.connect() as connection:
        result = connection.execute(text("SELECT DATABASE()"))
        database_name = result.scalar()

    return {
        "database": database_name,
        "status": "connected"
    }