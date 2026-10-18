from decimal import Decimal
from unittest.mock import patch
import os
from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token
from .models import Category, Product, Order, OrderItem, Review, StockMovement


class FakeRazorpay:
    def __init__(self):
        self.created_orders = 0
        self.payment_items = []
        self.payment = self.FakePayment(self)
        self.order = self.FakeOrder(self)
        self.utility = self.FakeUtility()

    class FakeOrder:
        def __init__(self, gateway):
            self.gateway = gateway

        def create(self, data):
            self.gateway.created_orders += 1
            self.gateway.amount = data['amount']
            return {'id': f"provider-order-{self.gateway.created_orders}"}

        def payments(self, provider_order_id):
            return {'items': self.gateway.payment_items}

    class FakePayment:
        def __init__(self, gateway):
            self.gateway = gateway
            self.status = 'captured'
            self.order_id = ''

        def fetch(self, payment_id):
            return {
                'id': payment_id,
                'order_id': self.order_id,
                'amount': self.gateway.amount,
                'status': self.status,
            }

    class FakeUtility:
        def verify_payment_signature(self, data):
            if data['razorpay_signature'] != 'valid-signature':
                raise ValueError('Invalid signature')


class SecurityAndEcommerceTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # 1. Create Admin User
        self.admin_user = User.objects.create_superuser(
            username='admin_staff',
            email='admin@lumiere.com',
            password='AdminPassword123!',
            first_name='Admin'
        )
        self.admin_token, _ = Token.objects.get_or_create(user=self.admin_user)

        # 2. Create Regular Customers
        self.customer1 = User.objects.create_user(
            username='customer1@lumiere.com',
            email='customer1@lumiere.com',
            password='CustomerPassword123!',
            first_name='Eleanor'
        )
        self.customer1_token, _ = Token.objects.get_or_create(user=self.customer1)

        self.customer2 = User.objects.create_user(
            username='customer2@lumiere.com',
            email='customer2@lumiere.com',
            password='CustomerPassword123!',
            first_name='Marcus'
        )
        self.customer2_token, _ = Token.objects.get_or_create(user=self.customer2)

        # 3. Create Sample Categories & Products
        self.category = Category.objects.create(name='Solitaires', slug='solitaires')
        self.product = Product.objects.create(
            category=self.category,
            name='Elysian Diamond Solitaire',
            slug='elysian-diamond-solitaire',
            price=Decimal('50000.00'),
            stock=5,
            material='18k Yellow Gold',
            gemstone='1.5 Carat Diamond'
        )

    def start_payment(self, gateway, idempotency_key='checkout-attempt-001'):
        payload = {
            'items': [{'id': self.product.id, 'quantity': 2, 'price': '0.01'}],
            'customer_phone': '9876543210',
            'shipping_address': '12 Jewel Street',
            'shipping_city': 'Mumbai',
            'shipping_postal_code': '400001',
            'shipping_country': 'India',
        }
        with patch.dict(os.environ, {
            'RAZORPAY_KEY_ID': 'rzp_test_public',
            'RAZORPAY_KEY_SECRET': 'test-secret',
        }), patch('api.views.get_razorpay_client', return_value=gateway):
            return self.client.post(
                '/api/payments/orders/',
                payload,
                format='json',
                HTTP_IDEMPOTENCY_KEY=idempotency_key,
            )

    # ── Test 1: Authentication (Register, Login, Password Change, Logout) ──
    def test_authentication_workflow(self):
        # Register new customer
        reg_response = self.client.post('/api/register/', {
            'name': 'Sophia Loren',
            'email': 'sophia@example.com',
            'password': 'SophiaPassword123!'
        })
        self.assertEqual(reg_response.status_code, status.HTTP_201_CREATED)
        self.assertIn('token', reg_response.data)

        # Login
        login_response = self.client.post('/api/login/', {
            'email': 'sophia@example.com',
            'password': 'SophiaPassword123!'
        })
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        token = login_response.data['token']

        # Change password
        auth_client = APIClient()
        auth_client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
        pw_response = auth_client.post('/api/change-password/', {
            'old_password': 'SophiaPassword123!',
            'new_password': 'NewStrongPassword456!'
        })
        self.assertEqual(pw_response.status_code, status.HTTP_200_OK)

        # Update credentials with rotated token after password change
        auth_client.credentials(HTTP_AUTHORIZATION=f'Token {pw_response.data["token"]}')

        # Logout
        logout_response = auth_client.post('/api/logout/')
        self.assertEqual(logout_response.status_code, status.HTTP_200_OK)

    def test_admin_can_login_and_receives_staff_claims(self):
        response = self.client.post('/api/login/', {
            'email': 'admin@lumiere.com',
            'password': 'AdminPassword123!',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['user']['is_staff'])
        self.assertTrue(response.data['user']['is_superuser'])

    # ── Test 2: Admin Endpoints Authorization & Protection ──
    def test_admin_endpoints_protection(self):
        # Regular customer cannot create product
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.customer1_token.key}')
        post_response = self.client.post('/api/products/', {
            'name': 'Hacked Gold Ring',
            'price': 100,
            'stock': 10
        })
        self.assertEqual(post_response.status_code, status.HTTP_403_FORBIDDEN)

        # Regular customer cannot delete product
        del_response = self.client.delete(f'/api/products/{self.product.slug}/')
        self.assertEqual(del_response.status_code, status.HTTP_403_FORBIDDEN)

        # Regular customer cannot view wholesale stock movements
        stock_response = self.client.get('/api/stock/movements/')
        self.assertEqual(stock_response.status_code, status.HTTP_403_FORBIDDEN)

        # Regular customer cannot view internal business revenue stats
        stats_response = self.client.get('/api/admin/stats/')
        self.assertEqual(stats_response.status_code, status.HTTP_403_FORBIDDEN)

        # Admin CAN create product
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.admin_token.key}')
        admin_create_response = self.client.post('/api/products/', {
            'name': 'Royal Emerald Brooch',
            'category': self.category.id,
            'price': 75000,
            'stock': 8,
            'material': 'Platinum',
            'gemstone': 'Natural Colombian Emerald'
        })
        self.assertEqual(admin_create_response.status_code, status.HTTP_201_CREATED)

    # ── Test 3: Customer Order Isolation (IDOR Prevention) ──
    def test_order_data_isolation(self):
        # Create Order for customer1
        order1 = Order.objects.create(
            order_number='LUM-TEST-001',
            user=self.customer1,
            customer_name='Eleanor',
            customer_email='customer1@lumiere.com',
            total_price=Decimal('50000.00'),
            status='Confirmed'
        )

        # Create Order for customer2
        order2 = Order.objects.create(
            order_number='LUM-TEST-002',
            user=self.customer2,
            customer_name='Marcus',
            customer_email='customer2@lumiere.com',
            total_price=Decimal('100000.00'),
            status='Confirmed'
        )

        # Unauthenticated user CANNOT list orders
        self.client.credentials()
        unauth_list = self.client.get('/api/orders/')
        self.assertEqual(unauth_list.status_code, status.HTTP_401_UNAUTHORIZED)

        # Customer1 only sees customer1's order
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.customer1_token.key}')
        c1_list = self.client.get('/api/orders/')
        self.assertEqual(c1_list.status_code, status.HTTP_200_OK)
        order_numbers = [o['order_number'] for o in c1_list.data]
        self.assertIn('LUM-TEST-001', order_numbers)
        self.assertNotIn('LUM-TEST-002', order_numbers)

        # Customer1 CANNOT view customer2's order detail (IDOR test)
        idor_get = self.client.get(f'/api/orders/{order2.order_number}/')
        self.assertEqual(idor_get.status_code, status.HTTP_403_FORBIDDEN)

        # Customer1 CANNOT cancel or modify customer2's order
        idor_cancel = self.client.patch(f'/api/orders/{order2.order_number}/', {'status': 'Cancelled'})
        self.assertEqual(idor_cancel.status_code, status.HTTP_403_FORBIDDEN)

        # Admin CAN see all orders
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.admin_token.key}')
        admin_list = self.client.get('/api/orders/')
        self.assertEqual(len(admin_list.data), 2)

    # ── Test 4: Authoritative Pricing & Inventory Deduction ──
    def test_payment_order_authoritative_price_and_idempotency(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.customer1_token.key}')
        gateway = FakeRazorpay()
        order_res = self.start_payment(gateway)
        self.assertEqual(order_res.status_code, status.HTTP_201_CREATED)
        order_data = order_res.data['order']
        created_order = Order.objects.get(pk=order_data['id'])
        self.assertEqual(created_order.total_price, Decimal('100000.00'))
        self.assertEqual(created_order.payment_status, 'Pending')
        self.assertEqual(created_order.status, 'Pending')
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 3)

        duplicate = self.start_payment(gateway)
        self.assertEqual(duplicate.status_code, status.HTTP_200_OK)
        self.assertEqual(duplicate.data['order']['id'], order_data['id'])
        self.assertEqual(gateway.created_orders, 1)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 3)

        movement = StockMovement.objects.filter(product=self.product, movement_type='OUT').first()
        self.assertIsNotNone(movement)
        self.assertEqual(movement.quantity, 2)
        self.assertEqual(movement.balance_after, 3)

    def test_payment_verification_and_repeat_are_idempotent(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.customer1_token.key}')
        gateway = FakeRazorpay()
        created = self.start_payment(gateway)
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        order = created.data['order']
        gateway.payment.order_id = created.data['razorpay_order_id']
        verify_payload = {
            'order_id': order['id'],
            'razorpay_order_id': created.data['razorpay_order_id'],
            'razorpay_payment_id': 'pay_test_001',
            'razorpay_signature': 'invalid-signature',
        }
        with patch.dict(os.environ, {
            'RAZORPAY_KEY_ID': 'rzp_test_public',
            'RAZORPAY_KEY_SECRET': 'test-secret',
        }), patch('api.views.get_razorpay_client', return_value=gateway):
            res = self.client.post('/api/payments/verify/', verify_payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Order.objects.get(pk=order['id']).payment_status, 'Pending')

        gateway.payment.status = 'captured'
        verify_payload['razorpay_signature'] = 'valid-signature'
        with patch.dict(os.environ, {
            'RAZORPAY_KEY_ID': 'rzp_test_public',
            'RAZORPAY_KEY_SECRET': 'test-secret',
        }), patch('api.views.get_razorpay_client', return_value=gateway):
            verified = self.client.post('/api/payments/verify/', verify_payload, format='json')
            repeated = self.client.post('/api/payments/verify/', verify_payload, format='json')
        self.assertEqual(verified.status_code, status.HTTP_200_OK)
        self.assertEqual(verified.data['payment_status'], 'Paid')
        self.assertEqual(repeated.status_code, status.HTTP_200_OK)
        self.assertEqual(OrderItem.objects.get(order_id=order['id']).status, 'Confirmed')
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 3)

    def test_payment_failure_releases_reserved_stock_once(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.customer1_token.key}')
        gateway = FakeRazorpay()
        created = self.start_payment(gateway)
        order = created.data['order']
        gateway.payment.order_id = created.data['razorpay_order_id']
        gateway.payment.status = 'failed'
        failure = {
            'order_id': order['id'],
            'razorpay_payment_id': 'pay_failed_001',
        }
        with patch.dict(os.environ, {
            'RAZORPAY_KEY_ID': 'rzp_test_public',
            'RAZORPAY_KEY_SECRET': 'test-secret',
        }), patch('api.views.get_razorpay_client', return_value=gateway):
            response = self.client.post('/api/payments/failure/', failure, format='json')
            repeated = self.client.post('/api/payments/failure/', failure, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(repeated.status_code, status.HTTP_200_OK)
        self.assertEqual(Order.objects.get(pk=order['id']).payment_status, 'Failed')
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 5)
        self.assertEqual(
            StockMovement.objects.filter(product=self.product, movement_type='RETURN').count(),
            1,
        )

    def test_pending_payment_cancellation_checks_provider_and_restocks_once(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.customer1_token.key}')
        gateway = FakeRazorpay()
        created = self.start_payment(gateway)
        order = created.data['order']
        gateway.payment_items = [{'status': 'authorized'}]
        with patch.dict(os.environ, {
            'RAZORPAY_KEY_ID': 'rzp_test_public',
            'RAZORPAY_KEY_SECRET': 'test-secret',
        }), patch('api.views.get_razorpay_client', return_value=gateway):
            blocked = self.client.post(f"/api/payments/orders/{order['id']}/cancel/")
        self.assertEqual(blocked.status_code, status.HTTP_409_CONFLICT)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 3)

        gateway.payment_items = []
        with patch.dict(os.environ, {
            'RAZORPAY_KEY_ID': 'rzp_test_public',
            'RAZORPAY_KEY_SECRET': 'test-secret',
        }), patch('api.views.get_razorpay_client', return_value=gateway):
            cancelled = self.client.post(f"/api/payments/orders/{order['id']}/cancel/")
            repeated = self.client.post(f"/api/payments/orders/{order['id']}/cancel/")
        self.assertEqual(cancelled.status_code, status.HTTP_200_OK)
        self.assertEqual(repeated.status_code, status.HTTP_200_OK)
        self.assertEqual(cancelled.data['payment_status'], 'Cancelled')
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 5)
        self.assertEqual(
            StockMovement.objects.filter(product=self.product, movement_type='RETURN').count(),
            1,
        )

    def test_customers_cannot_create_unpaid_orders_or_set_payment_state(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.customer1_token.key}')
        direct_order = self.client.post('/api/orders/', {
            'items': [{'id': self.product.id, 'quantity': 1}],
        }, format='json')
        self.assertEqual(direct_order.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

        order = Order.objects.create(
            order_number='LUM-PENDING-001',
            user=self.customer1,
            status='Pending',
            payment_status='Pending',
        )
        tamper = self.client.patch(
            f'/api/orders/{order.order_number}/',
            {'payment_status': 'Paid', 'status': 'Confirmed'},
            format='json',
        )
        self.assertEqual(tamper.status_code, status.HTTP_403_FORBIDDEN)
        order.refresh_from_db()
        self.assertEqual(order.payment_status, 'Pending')

    def test_admin_revenue_uses_only_verified_payments(self):
        Order.objects.create(
            order_number='LUM-PAID-STAT',
            user=self.customer1,
            total_price=Decimal('50000.00'),
            status='Confirmed',
            payment_status='Paid',
        )
        Order.objects.create(
            order_number='LUM-UNPAID-STAT',
            user=self.customer2,
            total_price=Decimal('100000.00'),
            status='Pending',
            payment_status='Pending',
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.admin_token.key}')
        response = self.client.get('/api/admin/stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['totalRevenue'], 50000.0)
        self.assertEqual(response.data['pendingPayments'], 1)

    def test_overselling_is_rejected_before_payment_order_is_created(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.customer1_token.key}')
        gateway = FakeRazorpay()
        with patch.dict(os.environ, {
            'RAZORPAY_KEY_ID': 'rzp_test_public',
            'RAZORPAY_KEY_SECRET': 'test-secret',
        }), patch('api.views.get_razorpay_client', return_value=gateway):
            response = self.client.post('/api/payments/orders/', {
                'items': [{'id': self.product.id, 'quantity': 6}],
                'customer_phone': '9876543210',
                'shipping_address': '12 Jewel Street',
                'shipping_city': 'Mumbai',
                'shipping_postal_code': '400001',
            }, format='json', HTTP_IDEMPOTENCY_KEY='checkout-attempt-oversell')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(gateway.created_orders, 0)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 5)

    # ── Test 7: Review Verification Enforcement ──
    def test_verified_purchase_review_enforcement(self):
        # Customer2 tries to submit a review without purchasing the piece
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.customer2_token.key}')
        unverified_res = self.client.post(f'/api/products/{self.product.slug}/reviews/', {
            'title': 'Looks nice in photos',
            'rating': 5,
            'comment': 'I never bought this but wanted to write a review.'
        })
        # Backend rejects unverified review attempt
        self.assertEqual(unverified_res.status_code, status.HTTP_400_BAD_REQUEST)

        # Only a payment-confirmed purchase grants review privileges.
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.customer1_token.key}')
        order = Order.objects.create(
            order_number='LUM-PAID-REVIEW',
            user=self.customer1,
            status='Confirmed',
            payment_status='Paid',
        )
        OrderItem.objects.create(
            order=order,
            product=self.product,
            product_name=self.product.name,
            quantity=1,
            price=self.product.price,
        )

        # Customer1 CAN now submit verified review
        verified_res = self.client.post(f'/api/products/{self.product.slug}/reviews/', {
            'title': 'Exquisite craftsmanship',
            'rating': 5,
            'comment': 'The diamond brilliance exceeded all my expectations.'
        })
        self.assertEqual(verified_res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(verified_res.data['is_verified'])
