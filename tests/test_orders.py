import pytest

from app.schemas.order import OrderItemInput
from app.utils.order_state import VALID_TRANSITIONS


def test_order_transition_pending():
    assert "accepted" in VALID_TRANSITIONS["pending"]
    assert "cancelled" in VALID_TRANSITIONS["pending"]


def test_order_transition_ready():
    assert VALID_TRANSITIONS["ready"] == {"completed"}


def test_order_transition_completed():
    assert VALID_TRANSITIONS["completed"] == set()


def test_order_transition_cancelled():
    assert VALID_TRANSITIONS["cancelled"] == set()


def test_order_item_input_allows_variant_only():
    payload = OrderItemInput(variant_id="variant-123", quantity=2)
    assert payload.item_id is None
    assert payload.variant_id == "variant-123"


def test_order_item_input_allows_item_only():
    payload = OrderItemInput(item_id="item-123", quantity=1)
    assert payload.item_id == "item-123"
    assert payload.variant_id is None


def test_order_item_input_requires_item_or_variant():
    with pytest.raises(ValueError):
        OrderItemInput(quantity=1)


def test_order_item_input_rejects_blank_variant_id():
    with pytest.raises(ValueError):
        OrderItemInput(item_id="item-123", variant_id="", quantity=1)

