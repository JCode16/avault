from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Cookie, Form, Depends, Response, HTTPException, status
from pydantic import EmailStr, ValidationError
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import jwt

from avault import crud, models, schemas
from avault.api import deps
from avault.core import security
from avault.core.config import settings

router = APIRouter()


@router.post('/register')
def register(email: EmailStr = Form(''),
             username: str = Form('', min_length=3, max_length=80),
             password: str = Form('', min_length=6, max_lenght=25,
                                  regex='^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$'),
             db: Session = Depends(deps.get_db)):
    email = email.lower().strip()
    username = username.lower().strip()
    user = models.User.query.filter_by(email=email.lower()).first()
    if (user):
        return {'error': 'User already exists'}, 409
    user = models.User(username, password, email, db)
    db.add(user)
    db.commit()
    return {'success': True}, 201


@router.post("/access-token", response_model=schemas.Token)
def login_access_token(
    response: Response,
    db: Session = Depends(deps.get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    user = crud.user.authenticate(
        db, email=form_data.username, password=form_data.password
    )
    if not user:
        raise HTTPException(
            status_code=400, detail="Incorrect email or password")
    access_token_expires = timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    refresh_token_expires = timedelta(
        minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "refresh_token": security.create_refresh_token(
            response, user.id,
            expires_delta=refresh_token_expires
        ),
        "token_type": "bearer",
    }


@router.post("/refresh-token", response_model=schemas.Token)
def refresh_token(response: Response, jid: str = Cookie(None)):
    """
    OAuth2 compatible token refresh, get an access token for future requests
    """
    try:
        payload = jwt.decode(
            jid if jid is not None else "", settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        token_data = schemas.TokenPayload(**payload)
    except (jwt.JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    access_token_expires = timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    refresh_token_expires = timedelta(
        minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            token_data.sub, expires_delta=access_token_expires
        ),
        "refresh_token": security.create_refresh_token(
            response, token_data.sub,
            expires_delta=refresh_token_expires
        ),
        "token_type": "bearer",
    }