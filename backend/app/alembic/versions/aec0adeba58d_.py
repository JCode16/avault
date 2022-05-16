"""empty message

Revision ID: aec0adeba58d
Revises: edd72e29be00
Create Date: 2022-05-15 22:00:38.545842

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'aec0adeba58d'
down_revision = 'edd72e29be00'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('relationships',
    sa.Column('requester_id', sa.BigInteger(), nullable=False),
    sa.Column('addressee_id', sa.BigInteger(), nullable=False),
    sa.Column('type', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['addressee_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['requester_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('requester_id', 'addressee_id')
    )
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_table('relationships')
    # ### end Alembic commands ###