import time

import httpx

BASE = "http://127.0.0.1:8000"
API = BASE + "/api/v1"


def req(method: str, path: str, **kwargs):
    response = httpx.request(method, API + path, timeout=20.0, **kwargs)
    content_type = response.headers.get("content-type", "")
    if "application/json" in content_type and response.text:
        payload = response.json()
    else:
        payload = response.text
    return response.status_code, payload


def wait_health():
    for _ in range(20):
        try:
            h = httpx.get(BASE + "/health", timeout=5.0)
            if h.status_code == 200:
                return
        except Exception:
            pass
        time.sleep(0.5)
    raise RuntimeError("Health check failed")


def main():
    wait_health()
    print("health", httpx.get(BASE + "/health", timeout=5.0).status_code)

    owner_phone = "9000001231"
    customer_phone = "9000001232"
    password = "StrongPass123"

    for role, phone, email in [
        ("shop_owner", owner_phone, "owner1231@example.com"),
        ("customer", customer_phone, "cust1232@example.com"),
    ]:
        status, _ = req(
            "POST",
            "/auth/register",
            json={
                "role": role,
                "name": role + " user",
                "phone": phone,
                "email": email,
                "password": password,
            },
        )
        print("register", role, status)

    status, data = req(
        "POST",
        "/auth/login",
        data={"username": owner_phone, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    print("owner login", status)
    owner_access = data.get("access_token") if isinstance(data, dict) else None
    owner_headers = {"Authorization": f"Bearer {owner_access}"}

    status, data = req(
        "POST",
        "/shops",
        json={
            "name": "Smoke Shop",
            "phone": "8111100999",
            "description": "smoke",
            "address_line": "Main",
            "city": "Chennai",
            "state": "TN",
            "pincode": "600001",
            "category": "Cafe",
            "opening_hours": "9-9",
        },
        headers=owner_headers,
    )
    print("create shop", status)
    shop_id = data.get("id") if isinstance(data, dict) else None

    item_id = None
    if shop_id:
        status, _ = req(
            "PATCH",
            f"/shops/{shop_id}/status",
            json={"is_open": True, "is_accepting_orders": True},
            headers=owner_headers,
        )
        print("open shop", status)

        status, data = req(
            "POST",
            f"/menu/shops/{shop_id}/items",
            json={
                "name": "Smoke Sandwich",
                "description": "ok",
                "price": 120,
                "category": "Snacks",
                "dietary_type": "veg",
                "prep_time_minutes": 12,
                "image_url": None,
            },
            headers=owner_headers,
        )
        print("create item", status)
        item_id = data.get("id") if isinstance(data, dict) else None

    status, data = req(
        "POST",
        "/auth/login",
        data={"username": customer_phone, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    print("customer login", status)
    customer_access = data.get("access_token") if isinstance(data, dict) else None
    customer_headers = {"Authorization": f"Bearer {customer_access}"}

    status, data = req("GET", "/shops?page=1&page_size=20", headers=customer_headers)
    print("list shops", status, "count", len(data) if isinstance(data, list) else "n/a")

    if not item_id and isinstance(data, list) and data:
        shop_id = data[0]["id"]
        status, menu = req("GET", f"/menu/shops/{shop_id}/items?page=1&page_size=20", headers=customer_headers)
        print("menu load", status)
        if isinstance(menu, list) and menu:
            item_id = menu[0]["id"]

    if shop_id and item_id:
        status, _ = req(
            "POST",
            "/orders",
            json={
                "shop_id": shop_id,
                "items": [{"item_id": item_id, "quantity": 1}],
                "payment_method": "cod",
                "instructions": "smoke test",
            },
            headers=customer_headers,
        )
        print("create order", status)

    status, data = req("GET", "/orders/customer/me?page=1&page_size=20", headers=customer_headers)
    print("my orders", status, "count", len(data) if isinstance(data, list) else "n/a")
    print("smoke test completed")


if __name__ == "__main__":
    main()

###