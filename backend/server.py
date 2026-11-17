import logging
import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, ConfigDict, Field, HttpUrl
from pymongo import MongoClient, ReturnDocument
from pymongo.errors import DuplicateKeyError, PyMongoError

app = FastAPI()
logger = logging.getLogger("uvicorn.error")

# Add your Expo web origin through CORS_ORIGINS if using another address.
origins = os.environ.get(
    "CORS_ORIGINS",
    "http://localhost:8081,http://127.0.0.1:8081",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip() for origin in origins.split(",") if origin.strip()
    ],
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

client = MongoClient(
    os.environ["MONGODB_URI"],
    serverSelectionTimeoutMS=5000,
)
db = client["cs3720db"]
collection = db["robots"]
users = db["activity12_users"]

jwt_secret = os.environ["JWT_SECRET"]
bearer = HTTPBearer(auto_error=False)


class Credentials(BaseModel):
    email: str = Field(min_length=1, max_length=254)
    password: str = Field(min_length=1, max_length=72)


class RobotCreate(BaseModel):
    model_config = ConfigDict(
        str_strip_whitespace=True,
        allow_inf_nan=False,
    )

    name: str = Field(min_length=1)
    price: float = Field(ge=0)
    description: str = Field(min_length=1)
    imageUrl: HttpUrl


@app.exception_handler(RequestValidationError)
async def validation_error_handler(
    request: Request,
    error: RequestValidationError,
):
    messages = []

    for issue in error.errors():
        location = ".".join(
            str(part) for part in issue["loc"] if part != "body"
        )
        messages.append(f"{location or 'request'}: {issue['msg']}")

    return JSONResponse(
        status_code=400,
        content={"detail": "; ".join(messages)},
    )


@app.exception_handler(DuplicateKeyError)
async def duplicate_error_handler(
    request: Request,
    error: DuplicateKeyError,
):
    logger.warning("Duplicate robot name: %s", error)

    return JSONResponse(
        status_code=409,
        content={
            "detail": (
                "Robot names must be unique. The requested name already "
                "exists, or existing duplicate names need correction."
            ),
        },
    )


@app.exception_handler(PyMongoError)
async def database_error_handler(
    request: Request,
    error: PyMongoError,
):
    logger.error("MongoDB error: %s: %s", type(error).__name__, error)

    return JSONResponse(
        status_code=503,
        content={"detail": "Database not reachable"},
    )


@app.exception_handler(Exception)
async def unexpected_error_handler(
    request: Request,
    error: Exception,
):
    logger.exception("Unexpected server error")

    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


def read_credentials(credentials: Credentials) -> tuple[str, bytes]:
    email = credentials.email.strip().lower()
    password = credentials.password.encode("utf-8")

    if not email or len(password) > 72:
        raise HTTPException(
            status_code=400,
            detail="Invalid email or password length",
        )

    return email, password


def unauthorized() -> HTTPException:
    return HTTPException(
        status_code=401,
        detail="Valid credentials required",
        headers={"WWW-Authenticate": "Bearer"},
    )


def require_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> str:
    if credentials is None:
        raise unauthorized()

    try:
        claims = jwt.decode(
            credentials.credentials,
            jwt_secret,
            algorithms=["HS256"],
            options={"require": ["sub", "exp"]},
        )
    except jwt.InvalidTokenError:
        raise unauthorized() from None

    email = claims["sub"]
    if not isinstance(email, str) or users.find_one({"_id": email}) is None:
        raise unauthorized()

    return email


def prepare_name_index():
    # MongoDB enforces uniqueness even for concurrent write requests.
    # Existing duplicates cause an error rather than being deleted.
    collection.create_index("name", unique=True)


def serialize_robot(robot):
    robot["_id"] = str(robot["_id"])
    return robot


@app.get("/")
@app.get("/hello")
def read_root():
    return {"message": "Hello from the backend!"}


@app.post("/signup", status_code=201)
def signup(credentials: Credentials):
    email, password = read_credentials(credentials)
    password_hash = bcrypt.hashpw(password, bcrypt.gensalt())

    try:
        users.insert_one({"_id": email, "passwordHash": password_hash})
    except DuplicateKeyError:
        raise HTTPException(
            status_code=409,
            detail="Email already registered",
        ) from None

    return {"msg": "signup ok"}


@app.post("/login")
def login(credentials: Credentials):
    email, password = read_credentials(credentials)
    user = users.find_one({"_id": email})

    if user is None or not bcrypt.checkpw(password, user["passwordHash"]):
        raise unauthorized()

    expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)
    token = jwt.encode(
        {"sub": email, "exp": expires_at},
        jwt_secret,
        algorithm="HS256",
    )

    return {"token": token}


@app.get("/protected")
def protected(email: str = Depends(require_user)):
    return {"msg": f"Hello {email}, this is protected data!"}


@app.get("/robots")
def get_robots():
    if "robots" not in db.list_collection_names():
        raise HTTPException(
            status_code=404,
            detail="Collection 'robots' not found",
        )

    return [
        serialize_robot(robot)
        for robot in collection.find()
    ]


@app.post("/robots", status_code=201, dependencies=[Depends(require_user)])
def add_robot(robot: RobotCreate):
    prepare_name_index()

    # JSON mode converts the validated URL into a MongoDB-compatible string.
    document = robot.model_dump(mode="json")
    result = collection.insert_one(document)
    document["_id"] = str(result.inserted_id)
    return document


@app.get("/robots/{name}")
def get_one_robot(name: str):
    robot = collection.find_one({"name": name})

    if robot is None:
        raise HTTPException(
            status_code=404,
            detail=f"Robot '{name}' not found",
        )

    return serialize_robot(robot)


@app.put("/robots/{name}")
def update_robot(name: str, robot: RobotCreate):
    existing = collection.find_one({"name": name})

    if existing is None:
        raise HTTPException(
            status_code=404,
            detail=f"Robot '{name}' not found",
        )

    prepare_name_index()

    updated = collection.find_one_and_update(
        {"_id": existing["_id"]},
        {"$set": robot.model_dump(mode="json")},
        return_document=ReturnDocument.AFTER,
    )

    if updated is None:
        raise HTTPException(
            status_code=404,
            detail=f"Robot '{name}' not found",
        )

    return serialize_robot(updated)


@app.delete("/robots/{name}")
def delete_robot(name: str):
    result = collection.delete_one({"name": name})

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail=f"Robot '{name}' not found",
        )

    return {"message": f"Robot '{name}' deleted successfully"}