"""empty message

Revision ID: 3098303fea63
Revises: 850cb8f85c77
Create Date: 2022-01-16 19:55:05.778888

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '3098303fea63'
down_revision = '850cb8f85c77'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('users', sa.Column('bot', sa.Boolean(), nullable=False, default=False))
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('users', 'bot')
    # ### end Alembic commands ###
