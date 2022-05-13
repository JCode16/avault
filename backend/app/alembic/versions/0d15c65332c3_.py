"""empty message

Revision ID: 0d15c65332c3
Revises: 93ef61092766
Create Date: 2022-05-12 00:22:58.301338

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0d15c65332c3'
down_revision = '93ef61092766'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('emojis',
    sa.Column('id', sa.BigInteger(), nullable=False),
    sa.Column('name', sa.Text(), nullable=False),
    sa.Column('roles', sa.ARRAY(sa.BigInteger()), nullable=False),
    sa.Column('user_id', sa.BigInteger(), nullable=False),
    sa.Column('animated', sa.Boolean(), nullable=False),
    sa.Column('guild_id', sa.BigInteger(), nullable=False),
    sa.ForeignKeyConstraint(['guild_id'], ['guilds.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_table('emojis')
    # ### end Alembic commands ###
