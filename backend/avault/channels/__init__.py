import enum

from sqlalchemy import true

from avault import db, snowflake_id


class ChannelType(enum.Enum):
    guild_text = 'GUILD_TEXT'
    dm = 'DM'
    guild_category = 'GUILD_CATEGORY'
    guild_news = 'GUILD_NEWS'
    guild_public_thread = 'GUILD_PUBLIC_THREAD'
    guild_private_thread = 'GUILD_PRIVATE_THREAD'
    group_dm = 'GROUP_DM'


channel_members = db.Table('channel_members',
                           db.Column('channel_id', db.BigInteger, db.ForeignKey(
                               'channels.id'), primary_key=True),
                           db.Column('user_id', db.BigInteger, db.ForeignKey(
                               'users.id'), primary_key=True))


class Channel(db.Model):
    __tablename__ = 'channels'
    id = db.Column(db.BigInteger, primary_key=True)
    type = db.Column(db.Enum(ChannelType), nullable=False)
    guild_id = db.Column(db.BigInteger, db.ForeignKey(
        'guilds.id'), nullable=True)
    position = db.Column(db.Integer, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    topic = db.Column(db.String(1024), nullable=True)
    nsfw = db.Column(db.Boolean, nullable=False)
    last_message_timestamp = db.Column(db.DateTime, nullable=True)
    owner_id = db.Column(db.BigInteger, db.ForeignKey(
        'users.id'), nullable=True)
    parent_id = db.Column(db.BigInteger, db.ForeignKey(
        'channels.id'), nullable=True)
    members = db.relationship(
        'User', secondary=channel_members, backref='channels')

    def __init__(self, type, guild_id, position, name, topic, nsfw, owner_id, parent_id):
        self.id = next(snowflake_id)
        self.type = type
        self.guild_id = guild_id
        self.position = position
        self.name = name
        self.topic = topic
        self.nsfw = nsfw
        self.owner_id = owner_id
        self.parent_id = parent_id
