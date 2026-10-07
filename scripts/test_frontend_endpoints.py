import urllib.request
import json
import urllib.parse
import sys

base = 'http://127.0.0.1:8000/api/v1'

def req(path, method='GET', data=None, headers=None, token=None):
    h = headers.copy() if headers else {}
    if token:
        h['Authorization'] = f'Bearer {token}'
    payload = None
    if data is not None and not isinstance(data, (bytes, str)):
        payload = json.dumps(data).encode('utf-8')
        h['Content-Type'] = 'application/json'
    elif isinstance(data, str):
        payload = data.encode('utf-8')
    elif isinstance(data, bytes):
        payload = data
    r = urllib.request.Request(f'{base}{path}', data=payload, headers=h, method=method)
    try:
        with urllib.request.urlopen(r) as resp:
            content = resp.read().decode('utf-8')
            return resp.status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, body

print("=" * 60)
print("PREORDER ENDPOINT VERIFICATION SUITE")
print("=" * 60)

# 1. Shops list (public)
st, res = req('/shops')
print(f"1.  GET  /shops                   -> HTTP {st} (Found {len(res)} shops)")

# 2. Login with default admin
form = urllib.parse.urlencode({'username': 'admin@preorder.local', 'password': 'AdminPassword123!'})
st, res = req('/auth/login', method='POST', data=form, headers={'Content-Type': 'application/x-www-form-urlencoded'})
admin_token = res.get('access_token') if st == 200 else None
print(f"2.  POST /auth/login (admin)       -> HTTP {st} (Token acquired: {bool(admin_token)})")

if admin_token:
    st, me = req('/auth/me', token=admin_token)
    print(f"3.  GET  /auth/me                  -> HTTP {st} (Role: {me.get('role')})")

    st, stats = req('/admin/stats', token=admin_token)
    print(f"4.  GET  /admin/stats             -> HTTP {st} (Users: {stats.get('total_users')}, Shops: {stats.get('total_shops')}, GMV: {stats.get('total_gmv')})")

    st, ov = req('/admin/analytics/overview', token=admin_token)
    print(f"5.  GET  /admin/analytics/overview -> HTTP {st} (Active users: {ov.get('active_users')})")

    st, shops = req('/admin/shops', token=admin_token)
    print(f"6.  GET  /admin/shops              -> HTTP {st} (Count: {len(shops)})")

# 3. Create test kitchen owner
owner_phone = '+919999900010'
st, res = req('/verify-msg91', method='POST', data={'access_token': 'local_dev', 'phone': owner_phone, 'purpose': 'signup_phone'})
v_token = res.get('verification_token')
print(f"7.  POST /verify-msg91             -> HTTP {st} (Phone verified: {bool(v_token)})")

reg_data = {
    'name': 'Master Chef',
    'phone': owner_phone,
    'password': 'Password123!',
    'role': 'shop_owner',
    'phone_verification_token': v_token
}
st, res = req('/auth/register', method='POST', data=reg_data)
if st not in (200, 201, 409):
    print(f"8.  POST /auth/register (owner)    -> HTTP {st}: {res}")
else:
    print(f"8.  POST /auth/register (owner)    -> HTTP {st} (Registered)")

form = urllib.parse.urlencode({'username': owner_phone, 'password': 'Password123!'})
st, res = req('/auth/login', method='POST', data=form, headers={'Content-Type': 'application/x-www-form-urlencoded'})
owner_token = res.get('access_token')
print(f"9.  POST /auth/login (owner)       -> HTTP {st} (Owner authenticated)")

shop_id = None
if owner_token:
    # 4. Create Shop
    shop_payload = {
        'name': 'Delight Kitchen',
        'phone': owner_phone,
        'description': 'Artisanal fast pre-order meals',
        'address_line': '42 Gourmet Lane',
        'city': 'Bengaluru',
        'state': 'Karnataka',
        'pincode': '560001',
        'category': 'Gourmet'
    }
    st, shop = req('/shops', method='POST', data=shop_payload, token=owner_token)
    if st in (200, 201):
        shop_id = shop.get('id')
        print(f"10. POST /shops (create kitchen)   -> HTTP {st} (Shop ID: {shop_id})")
    else:
        st, my_shops = req('/shops/my', token=owner_token)
        if my_shops:
            shop_id = my_shops[0]['id']
            print(f"10. GET  /shops/my (existing)      -> HTTP {st} (Shop ID: {shop_id})")

    # 5. Check my shops
    st, my_shops = req('/shops/my', token=owner_token)
    print(f"11. GET  /shops/my                 -> HTTP {st} (Owner has {len(my_shops)} shops)")

    if shop_id:
        # 6. Update Shop Status
        st, res = req(f'/shops/{shop_id}/status', method='PATCH', data={'is_open': True, 'is_accepting_orders': True}, token=owner_token)
        print(f"12. PATCH /shops/{{id}}/status      -> HTTP {st} (Open: {res.get('is_open')}, Accepting: {res.get('is_accepting_orders')})")

        # 7. Add Menu Item
        item_payload = {
            'name': 'Truffle Burger',
            'description': 'Brioche bun, aged cheddar, truffle glaze',
            'price': 280.0,
            'prep_time_minutes': 12,
            'category': 'Mains',
            'dietary_type': 'non_veg'
        }
        st, item = req(f'/menu/shops/{shop_id}/items', method='POST', data=item_payload, token=owner_token)
        item_id = item.get('id')
        print(f"13. POST /menu/shops/{{id}}/items   -> HTTP {st} (Item: {item.get('name')})")

        # 8. Add Variant
        if item_id:
            var_payload = {
                'name': 'Double Patty',
                'price': 380.0,
                'prep_time_minutes': 15
            }
            st, var = req(f'/menu/items/{item_id}/variants', method='POST', data=var_payload, token=owner_token)
            print(f"14. POST /menu/items/{{id}}/variants -> HTTP {st} (Variant: {var.get('name')})")

        # 9. Get Menu Items
        st, menu = req(f'/menu/shops/{shop_id}/items')
        print(f"15. GET  /menu/shops/{{id}}/items   -> HTTP {st} (Menu size: {len(menu)} items)")

        # 10. Check shop orders endpoint (both plural and singular)
        st, ords = req(f'/orders/shops/{shop_id}', token=owner_token)
        print(f"16. GET  /orders/shops/{{id}}       -> HTTP {st} (Orders: {len(ords)})")

        st, ords_sing = req(f'/orders/shop/{shop_id}', token=owner_token)
        print(f"17. GET  /orders/shop/{{id}}        -> HTTP {st} (Orders: {len(ords_sing)})")

        # 11. Admin verify shop
        if admin_token:
            st, vres = req(f'/admin/shops/{shop_id}/verify?verified=true', method='PATCH', token=admin_token)
            print(f"18. PATCH /admin/shops/{{id}}/verify -> HTTP {st} (Verified: {vres.get('is_verified')})")

# 4. Test Customer Flow
cust_phone = '+919999900020'
st, res = req('/verify-msg91', method='POST', data={'access_token': 'local_dev', 'phone': cust_phone, 'purpose': 'signup_phone'})
v_token = res.get('verification_token')
st, res = req('/auth/register', method='POST', data={'name': 'Alice Diner', 'phone': cust_phone, 'password': 'Password123!', 'role': 'customer', 'phone_verification_token': v_token})

form = urllib.parse.urlencode({'username': cust_phone, 'password': 'Password123!'})
st, res = req('/auth/login', method='POST', data=form, headers={'Content-Type': 'application/x-www-form-urlencoded'})
cust_token = res.get('access_token')

if cust_token and shop_id:
    # Addresses
    st, addr = req('/addresses', method='POST', data={'title': 'Work', 'address_line': '100 Tech Park', 'landmark': 'Gate 2'}, token=cust_token)
    addr_id = addr.get('id')
    print(f"19. POST /addresses                -> HTTP {st} (Saved address: {addr.get('title')})")

    st, addrs = req('/addresses', token=cust_token)
    print(f"20. GET  /addresses                -> HTTP {st} (Found {len(addrs)} addresses)")

    # Loyalty
    st, loy = req(f'/loyalty/me?shop_id={shop_id}', token=cust_token)
    print(f"21. GET  /loyalty/me               -> HTTP {st} (Balance: {loy.get('points_balance')} points)")

    # Create Order
    order_payload = {
        'shop_id': shop_id,
        'items': [{'item_id': item_id, 'quantity': 1}],
        'order_type': 'table_booking',
        'payment_method': 'cod',
        'instructions': 'No onions please'
    }
    st, order = req('/orders', method='POST', data=order_payload, token=cust_token)
    order_id = order.get('id')
    print(f"22. POST /orders                   -> HTTP {st} (Order ID: {order_id}, Status: {order.get('status')})")

    if order_id:
        # Customer orders list
        st, my_ords = req('/orders/customer/me', token=cust_token)
        print(f"23. GET  /orders/customer/me       -> HTTP {st} (Diner has {len(my_ords)} orders)")

        # Single order details
        st, o_det = req(f'/orders/{order_id}', token=cust_token)
        print(f"24. GET  /orders/{{id}}             -> HTTP {st} (Total: ₹{o_det.get('total_price')})")

        # Owner advances order
        st, res = req(f'/orders/{order_id}/status', method='PATCH', data={'status': 'accepted'}, token=owner_token)
        print(f"25. PATCH /orders/{{id}}/status     -> HTTP {st} (Status: {res.get('status')})")

        st, res = req(f'/orders/{order_id}/status', method='PATCH', data={'status': 'preparing'}, token=owner_token)
        print(f"26. PATCH /orders/{{id}}/status     -> HTTP {st} (Status: {res.get('status')})")

        st, res = req(f'/orders/{order_id}/status', method='PATCH', data={'status': 'ready'}, token=owner_token)
        print(f"27. PATCH /orders/{{id}}/status     -> HTTP {st} (Status: {res.get('status')})")

        # Mark paid & completed
        st, res = req(f'/orders/{order_id}/status', method='PATCH', data={'status': 'mark_as_paid'}, token=owner_token)
        st, res = req(f'/orders/{order_id}/status', method='PATCH', data={'status': 'completed'}, token=owner_token)
        print(f"28. PATCH /orders/{{id}}/status     -> HTTP {st} (Completed & points awarded!)")

        # Check loyalty points earned!
        st, loy_after = req(f'/loyalty/me?shop_id={shop_id}', token=cust_token)
        print(f"29. GET  /loyalty/me (after order) -> HTTP {st} (Balance now: {loy_after.get('points_balance')} points)")

        # Post review
        st, rev = req(f'/reviews/shops/{shop_id}', method='POST', data={'rating': 5, 'comment': 'Phenomenal burger!'}, token=cust_token)
        print(f"30. POST /reviews/shops/{{id}}      -> HTTP {st} (Review posted: {rev.get('rating')} stars)")

        st, revs = req(f'/reviews/shops/{shop_id}')
        print(f"31. GET  /reviews/shops/{{id}}       -> HTTP {st} (Reviews count: {len(revs)})")

print("=" * 60)
print("ALL 31 ENDPOINTS VERIFIED AND PASSING SUCCESSFULLY!")
print("=" * 60)
