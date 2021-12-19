from typing import List

from fastapi import APIRouter, Depends, Response, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session

from api.api import deps
from api.core.events import Events, websocket_emitter
from api.crud import user
from api.models.channels import Channel, ChannelType
from api.models.guilds import GuildMembers
from api.models.user import User

router = APIRouter()


class PatchUser(BaseModel):
    username: str


class CreateDm(BaseModel):
    recipient_id: int


class CreateGroup(BaseModel):
    recipient_ids: List[int]


@router.get("/@me")
def get_me(current_user: User = Depends(deps.get_current_user)):
    return current_user.serialize()


@router.patch("/@me")
def edit_me(body: PatchUser, db: Session = Depends(deps.get_db),
            current_user: User = Depends(deps.get_current_user)):
    existing_user = db.query(User).filter_by(
        username=body.username).filter_by(tag=current_user.tag).first()
    tag = ""
    if existing_user:
        tag = current_user.generate_tag(body.username)
    current_user.username = body.username
    if tag:
        current_user.tag = tag
        db.commit()
    return current_user.serialize()


# TODO: update this function
@router.post("/@me/channels")
def create_dm_channel(body: CreateDm, response: Response, db: Session = Depends(deps.get_db),
                      user: User = Depends(deps.get_current_user)):
    channel: Channel = Channel(ChannelType.dm, None, "", owner_id=user.id)
    recipient = db.query(User).filter_by(id=user.id).first()
    if not recipient:
        response.status_code = 404
        return {"message": "User not found"}
    channel.members.append(user)
    channel.members.append(recipient)
    db.add(channel)
    db.commit()
    return channel.serialize()


# TODO: update this function
@router.post("/@me/channels/group")
def create_group_dm(body: CreateGroup, response: Response, db: Session = Depends(deps.get_db),
                    current_user: User = Depends(deps.get_current_user)):
    channel: Channel = Channel(ChannelType.group_dm, None, "", owner_id=current_user.id)
    for recipient_id in body.recipient_ids:
        recipient = db.query(User).filter_by(id=recipient_id).first()
        if not recipient:
            response.status_code = 404
            return {"message": "User not found"}
        channel.members.append(recipient)
    channel.members.append(current_user)
    db.add(channel)
    db.commit()
    return channel.serialize()


@router.get("/@me/channels")
def get_dm_channels(db: Session = Depends(deps.get_db),
                    current_user: User = Depends(deps.get_current_user)):
    return {[channel.serialize() for channel in current_user.channels]}


@router.get('/{user_id}', dependencies=[Depends(deps.get_current_user)])
def get_user(user_id: int, response: Response, db: Session = Depends(deps.get_db)):
    my_user = user.get(db, user_id)
    if my_user:
        return my_user.serialize()
    response.status_code = 404
    return {"message": "User not found"}


@router.get('/@me/guilds')
def get_guilds(current_user: User = Depends(deps.get_current_user)):
    return [guild.guild.preview() for guild in current_user.guilds]


@router.delete('/@me/guilds/{guild_id}', status_code=204)
def leave_guild(guild_id: int, response: Response, background_task: BackgroundTasks,
                current_user: User = Depends(deps.get_current_user),
                db: Session = Depends(deps.get_db)):
    guild_member = db.query(GuildMembers).filter_by(
        user_id=current_user.id, guild_id=guild_id).first()
    if guild_member:
        db.delete(guild_member)
        db.commit()
        background_task.add_task(websocket_emitter, None, guild_id, Events.GUILD_MEMBER_REMOVE,
                                 guild_member.serialize())
        background_task.add_task(websocket_emitter, None, guild_id, Events.GUILD_DELETE, {'guild_id': guild_id},
                                 current_user.id)
        return
    response.status_code = 404
    return {'success': False}