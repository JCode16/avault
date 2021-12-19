import functools
import operator
from typing import Generator, List, Union

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import jwt
from pydantic import ValidationError
from sqlalchemy.orm import Session

from api import models, schemas, crud
from api.core import security
from api.core.compute_permissions import compute_overwrites
from api.core.config import settings
from api.core.permissions import Permissions
from api.db.session import SessionLocal

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/access-token"
)


def get_db() -> Generator[Session, None, None]:
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()


def get_current_user(
        db: Session = Depends(get_db), token: str = Depends(reusable_oauth2)
) -> models.User:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        token_data = schemas.TokenPayload(**payload)
    except (jwt.JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )

    user = crud.user.get(db, id=token_data.sub)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


class ChannelPerms:
    def __init__(self, permission: Union[Permissions, List[Permissions]]) -> None:
        if isinstance(permission, list):
            self.permission = functools.reduce(operator.or_, permission)
        else:
            self.permission = permission

    async def is_valid(self, channel: models.Channel, current_user: models.User, db: Session) -> bool:
        if not channel:
            return False
        if channel.guild_id:
            guild_member: models.GuildMembers = db.query(models.GuildMembers).filter_by(
                guild_id=channel.guild_id).filter_by(
                user_id=current_user.id).first()
            if not guild_member:
                return False

            if guild_member.is_owner:
                return True

            if guild_member.permissions & Permissions.ADMINISTRATOR == Permissions.ADMINISTRATOR:
                return True
            permissions = await compute_overwrites(guild_member.permissions, channel, guild_member, db)

            if not permissions & self.permission == self.permission:
                return False

            return True

    async def __call__(
            self,
            channel_id: int,
            current_user: models.User = Depends(get_current_user),
            db: Session = Depends(get_db),
    ) -> tuple[models.Channel, models.User]:
        channel: models.Channel = db.query(models.Channel).filter_by(id=channel_id).first()
        if not channel:
            raise HTTPException(status_code=404, detail="Channel Not Found")
        if not await self.is_valid(channel, current_user, db):
            raise HTTPException(status_code=403, detail="Not Authorized")
        return channel, current_user


class InvitePerms:
    def __init__(self, permission: Permissions) -> None:
        self.permission = permission

    async def __call__(
            self,
            request: Request,
            current_user: models.User = Depends(get_current_user),
            db: Session = Depends(get_db),
    ) -> models.Invite:
        code = request.path_params["code"]
        invite: models.Invite = db.query(models.Invite).filter_by(id=code).first()
        if not invite:
            raise HTTPException(status_code=404, detail="Invite not found")
        channels = invite.channel
        if channels.guild_id:
            guild_member: models.GuildMembers = db.query(models.GuildMembers).filter_by(
                user_id=current_user.id, guild_id=channels.guild_id
            ).first()
            if guild_member:
                permissions = await compute_overwrites(
                    guild_member.permissions, channels, guild_member, db)
                if permissions & self.permission == self.permission:
                    return invite
        if channels.is_member(current_user.id):
            return invite
        raise HTTPException(
            status_code=403, detail="You do not have permission to delete this invite")


class GuildPerms:
    def __init__(self, permission: Permissions) -> None:
        self.permission = permission

    async def __call__(
            self,
            guild_id: int,
            current_user: models.User = Depends(get_current_user),
            db: Session = Depends(get_db),
    ) -> tuple[models.Guild, models.User]:
        guild: models.Guild = db.query(models.Invite).filter_by(id=guild_id).first()
        if not guild:
            raise HTTPException(status_code=404, detail="Guild not found")

        member: models.GuildMembers = db.query(models.GuildMembers).filter_by(guild_id=guild_id).filter_by(
            user_id=current_user.id).first()

        if not member:
            raise HTTPException(status_code=403, detail="Not Authorized")

        if member.is_owner:
            return guild, current_user

        if member.permissions & Permissions.ADMINISTRATOR == Permissions.ADMINISTRATOR:
            return guild, current_user

        if not member.permissions & self.permission == self.permission:
            raise HTTPException(status_code=403, detail="Not Authorized")

        return guild, current_user