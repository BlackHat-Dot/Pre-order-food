from pydantic import (
    BaseModel,
    Field,
)


class Pagination(BaseModel):

    page: int = Field(
        default=1,
        ge=1,
    )

    page_size: int = Field(
        default=20,
        ge=1,
        le=100,
    )


class MessageResponse(BaseModel):

    message: str = Field(
        min_length=1,
        max_length=500,
    )