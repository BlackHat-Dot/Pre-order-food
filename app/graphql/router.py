from __future__ import annotations

import asyncio
from fastapi import Request, Response, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from strawberry.fastapi import GraphQLRouter

from app.core.config import settings
from app.db.session import get_db
from app.core.deps import get_optional_token_from_request, _user_from_access_token
from app.graphql.schema import schema


async def get_graphql_context(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> dict:
    token = await get_optional_token_from_request(request)
    user = None
    if token:
        try:
            user = await _user_from_access_token(token, db)
        except Exception:
            user = None

    return {
        "request": request,
        "response": response,
        "db": db,
        "db_lock": asyncio.Lock(),
        "user": user,
    }


is_prod = settings.ENV.lower() in {"production", "prod", "staging"}

graphql_router = GraphQLRouter(
    schema=schema,
    context_getter=get_graphql_context,
    graphql_ide=None if is_prod else "graphiql",
)
