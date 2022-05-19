"""empty message

Revision ID: ebc461d6915c
Revises: 34288f90e9dc
Create Date: 2022-05-18 21:53:18.501208

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'ebc461d6915c'
down_revision = '34288f90e9dc'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_constraint('channel_members_user_id_fkey', 'channel_members', type_='foreignkey')
    op.drop_constraint('channel_members_channel_id_fkey', 'channel_members', type_='foreignkey')
    op.create_foreign_key(None, 'channel_members', 'users', ['user_id'], ['id'], ondelete='CASCADE')
    op.create_foreign_key(None, 'channel_members', 'channels', ['channel_id'], ['id'], ondelete='CASCADE')
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_constraint(None, 'channel_members', type_='foreignkey')
    op.drop_constraint(None, 'channel_members', type_='foreignkey')
    op.create_foreign_key('channel_members_channel_id_fkey', 'channel_members', 'channels', ['channel_id'], ['id'])
    op.create_foreign_key('channel_members_user_id_fkey', 'channel_members', 'users', ['user_id'], ['id'])
    # ### end Alembic commands ###