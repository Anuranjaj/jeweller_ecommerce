import logging
import hashlib
import hmac
import os
import uuid
from decimal import Decimal
from django.shortcuts import get_object_or_404
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.core.exceptions import ImproperlyConfigured
from django.db import IntegrityError, transaction
from django.db.models import Sum, Count, F
from django.utils import timezone
from datetime import timedelta
from rest_framework import generics, filters, status
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from django.views.decorators.csrf import csrf_exempt
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, PermissionDenied

from .models import Product, Category, Review, Order, OrderItem, StockMovement
from .permissions import IsAdminOrReadOnly, IsAdminUserOnly, IsOrderOwnerOrAdmin
from .serializers import (
    ProductSerializers,
    ProductCreateUpdateSerializer,
    CategorySerializer, 
    ReviewSerializer,
    OrderSerializer,
    StockMovementSerializer,
    UserSerializer,
    UserRegisterSerializer,
    ChangePasswordSerializer,
    UserProfileUpdateSerializer,
    PaymentOrderCreateSerializer,
    PaymentVerificationSerializer,
    PaymentFailureSerializer,
)
from .payments import get_razorpay_client, get_razorpay_key_id, payments_enabled

logger = logging.getLogger(__name__)


# 1. Fetch Categories & Admin Category Creation
class CategoryListAPIView(generics.ListCreateAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdminUserOnly()]
        return [AllowAny()]


# 2. Fetch Products & Create New Product (Admin Staff Only)
class ProductListAPIView(generics.ListCreateAPIView):
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description', 'material', 'gemstone']

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdminUserOnly()]
        return [AllowAny()]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ProductCreateUpdateSerializer
        return ProductSerializers

    def get_queryset(self):
        queryset = Product.objects.all().order_by('-created_at')
        category_slug = self.request.query_params.get('category', None)
        if category_slug:
            slug_variants = [category_slug]
            if category_slug.endswith('s'):
                slug_variants.append(category_slug[:-1])
            else:
                slug_variants.append(f"{category_slug}s")
            queryset = queryset.filter(category__slug__in=slug_variants)
        return queryset



# 3. Retrieve, Update & Delete SINGLE Product (Update/Delete Admin Staff Only)
class ProductDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Product.objects.all()

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [IsAdminUserOnly()]
        return [AllowAny()]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return ProductCreateUpdateSerializer
        return ProductSerializers

    def get_object(self):
        lookup = self.kwargs.get('slug')
        if lookup and lookup.isdigit():
            return get_object_or_404(Product, pk=int(lookup))
        return get_object_or_404(Product, slug=lookup)


# 4. Fetch and Create Product Reviews (Creation Verified on Backend)
class ProductReviewListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = ReviewSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated()]
        return [AllowAny()]

    def get_product(self):
        lookup = self.kwargs.get('slug')
        if lookup and lookup.isdigit():
            return get_object_or_404(Product, pk=int(lookup))
        return get_object_or_404(Product, slug=lookup)

    def get_queryset(self):
        product = self.get_product()
        return Review.objects.filter(product=product).order_by('-created_at')

    def perform_create(self, serializer):
        product = self.get_product()
        user = self.request.user

        # Backend verification of purchase
        has_purchased = Order.objects.filter(
            user=user,
            payment_status='Paid',
            items__product=product
        ).exclude(status='Cancelled').exists()

        if not has_purchased and not (user.is_staff or user.is_superuser):
            raise ValidationError(
                {"detail": "Only verified clients who have purchased this luxury piece may submit a review."}
            )

        # Ensure reviewer identity matches authenticated account
        author_name = user.first_name if user.first_name else user.username
        if user.last_name:
            author_name = f"{user.first_name} {user.last_name}".strip()

        serializer.save(
            product=product,
            user=user,
            author_name=author_name,
            is_verified=has_purchased
        )


# 4b. Check if authenticated user has purchased a product
class VerifyProductPurchaseAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug):
        if not request.user or not request.user.is_authenticated:
            return Response({"purchased": False, "authenticated": False})

        lookup = slug
        if lookup.isdigit():
            product = Product.objects.filter(pk=int(lookup)).first()
        else:
            product = Product.objects.filter(slug=lookup).first()

        if not product:
            return Response({"purchased": False, "authenticated": True})

        has_purchased = Order.objects.filter(
            user=request.user,
            payment_status='Paid',
            items__product=product
        ).exclude(status='Cancelled').exists()

        return Response({"purchased": has_purchased, "authenticated": True})


# 5. Fetch FEATURED products
class FeaturedProductListAPIView(generics.ListAPIView):
    queryset = Product.objects.filter(is_featured=True)
    serializer_class = ProductSerializers
    permission_classes = [AllowAny]


# 6. Orders are readable by their owner or store staff; checkout uses the payment API.
class OrderListCreateAPIView(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return Order.objects.none()

        if user.is_staff or user.is_superuser:
            return Order.objects.all().order_by('-created_at')

        return Order.objects.filter(user=user).order_by('-created_at')


# 7. Order Detail & Status Update (Isolated per Customer, Fully Accessible to Staff)
class OrderDetailUpdateAPIView(generics.RetrieveUpdateAPIView):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [IsOrderOwnerOrAdmin]

    def get_object(self):
        lookup = self.kwargs.get('pk_or_number')
        if lookup and lookup.isdigit():
            order = Order.objects.filter(pk=int(lookup)).first()
            if order:
                self.check_object_permissions(self.request, order)
                return order
        order = get_object_or_404(Order, order_number=lookup)
        self.check_object_permissions(self.request, order)
        return order

    def perform_update(self, serializer):
        instance = self.get_object()
        old_status = instance.status
        requested_status = self.request.data.get('status')
        is_admin = self.request.user.is_staff or self.request.user.is_superuser

        if not is_admin:
            if requested_status != 'Cancelled':
                raise PermissionDenied("Customers can only cancel active orders.")
        if requested_status == 'Cancelled' and instance.payment_status == 'Paid':
            raise ValidationError("Paid orders require a verified refund before cancellation.")
        if requested_status == 'Cancelled' and instance.payment_provider_order_id:
            client = PaymentOrderCreateAPIView._get_client()
            if isinstance(client, Response):
                raise ValidationError(client.data)
            try:
                provider_payments = client.order.payments(instance.payment_provider_order_id)
            except Exception:
                logger.exception('Could not confirm Razorpay order state for cancellation of %s.', instance.order_number)
                raise ValidationError("Unable to verify payment status. The order remains unchanged.")
            if any(payment.get('status') not in ['failed'] for payment in provider_payments.get('items', [])):
                raise ValidationError("A payment is still processing. The order remains unchanged.")

        with transaction.atomic():
            if requested_status == 'Cancelled':
                order = serializer.save(status='Cancelled')
                if order.payment_status == 'Pending':
                    order.payment_status = 'Cancelled'
                    order.save(update_fields=['payment_status', 'updated_at'])
            else:
                order = serializer.save()

            # If order was cancelled, atomically restock items and log stock return
            if old_status != 'Cancelled' and order.status == 'Cancelled':
                for item in order.items.select_for_update():
                    if item.product:
                        prod = Product.objects.select_for_update().get(pk=item.product.pk)
                        prod.stock += item.quantity
                        prod.save(update_fields=['stock'])

                        StockMovement.objects.create(
                            product=prod,
                            movement_type='RETURN',
                            quantity=item.quantity,
                            balance_after=prod.stock,
                            reason=f'Cancelled Order #{order.order_number}'
                        )
                order.items.update(status='Cancelled')


class PaymentConfigAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({
            'enabled': payments_enabled(),
            'key_id': get_razorpay_key_id() if payments_enabled() else '',
        })


class PaymentOrderCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PaymentOrderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        idempotency_key = request.headers.get('Idempotency-Key', '').strip()
        if not 16 <= len(idempotency_key) <= 64:
            return Response(
                {'detail': 'A unique Idempotency-Key header (16–64 characters) is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing = Order.objects.filter(user=request.user, idempotency_key=idempotency_key).first()
        if existing:
            if existing.status == 'Pending' and existing.payment_provider_order_id:
                return self._response(existing, status.HTTP_200_OK)
            return Response(
                {'detail': 'This checkout attempt has already been completed or cancelled.'},
                status=status.HTTP_409_CONFLICT,
            )

        client = self._get_client()
        if isinstance(client, Response):
            return client

        data = serializer.validated_data
        requested_items = data['items']
        product_ids = {item['id'] for item in requested_items}
        quantities = {}
        for item in requested_items:
            quantities[item['id']] = quantities.get(item['id'], 0) + item['quantity']

        try:
            with transaction.atomic():
                products = Product.objects.select_for_update().filter(pk__in=product_ids).in_bulk()
                missing_ids = product_ids.difference(products)
                if missing_ids:
                    raise ValidationError({'items': 'One or more selected products are no longer available.'})

                for product_id, quantity in quantities.items():
                    product = products[product_id]
                    if product.stock < quantity:
                        raise ValidationError({
                            'stock': f"Insufficient stock for '{product.name}'. Available: {product.stock}."
                        })

                total = sum(
                    (products[item['id']].price * item['quantity'] for item in requested_items),
                    Decimal('0.00'),
                )
                provider_order = client.order.create({
                    'amount': int(total * 100),
                    'currency': 'INR',
                    'receipt': f'LUM-{uuid.uuid4().hex[:24].upper()}',
                    'payment_capture': 1,
                })
                provider_order_id = provider_order.get('id')
                if not provider_order_id:
                    logger.error('Razorpay returned an order without an order id.')
                    return Response(
                        {'detail': 'The payment provider did not return an order reference. Please retry.'},
                        status=status.HTTP_502_BAD_GATEWAY,
                    )

                order_number = f"LUM-{uuid.uuid4().hex[:8].upper()}"
                order = Order.objects.create(
                    order_number=order_number,
                    user=request.user,
                    customer_name=request.user.get_full_name() or request.user.username,
                    customer_email=request.user.email,
                    customer_phone=data['customer_phone'],
                    shipping_address=data['shipping_address'],
                    shipping_city=data['shipping_city'],
                    shipping_postal_code=data['shipping_postal_code'],
                    shipping_country=data.get('shipping_country', 'India'),
                    payment_method='Razorpay',
                    payment_status='Pending',
                    payment_provider_order_id=provider_order_id,
                    idempotency_key=idempotency_key,
                    total_price=total,
                    status='Pending',
                )

                for product_id, quantity in quantities.items():
                    product = products[product_id]
                    product.stock -= quantity
                    product.save(update_fields=['stock'])
                    StockMovement.objects.create(
                        product=product,
                        movement_type='OUT',
                        quantity=quantity,
                        balance_after=product.stock,
                        reason=f'Payment reservation for Order #{order.order_number}',
                    )

                for item in requested_items:
                    product = products[item['id']]
                    OrderItem.objects.create(
                        order=order,
                        product=product,
                        product_name=product.name,
                        product_image=product.image.url if product.image else '',
                        quantity=item['quantity'],
                        price=product.price,
                        metal=item.get('metal') or product.material,
                        size=item.get('size', ''),
                        status='Pending',
                    )
        except ValidationError as error:
            return Response(error.detail, status=status.HTTP_400_BAD_REQUEST)
        except IntegrityError:
            existing = Order.objects.filter(user=request.user, idempotency_key=idempotency_key).first()
            if existing and existing.payment_provider_order_id:
                return self._response(existing, status.HTTP_200_OK)
            return Response(
                {'detail': 'This checkout request is already being processed. Please retry shortly.'},
                status=status.HTTP_409_CONFLICT,
            )
        except Exception:
            logger.exception('Razorpay order creation failed.')
            return Response(
                {'detail': 'Unable to initialize payment. Please retry.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return self._response(order, status.HTTP_201_CREATED)

    @staticmethod
    def _get_client():
        try:
            return get_razorpay_client()
        except ImproperlyConfigured as error:
            return Response({'detail': str(error)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    @staticmethod
    def _response(order, status_code):
        return Response({
            'order': OrderSerializer(order).data,
            'key_id': get_razorpay_key_id(),
            'razorpay_order_id': order.payment_provider_order_id,
            'amount': int(order.total_price * 100),
            'currency': 'INR',
        }, status=status_code)


class PaymentVerifyAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PaymentVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        order = get_object_or_404(Order, pk=data['order_id'], user=request.user)

        if order.payment_provider_order_id != data['razorpay_order_id']:
            raise ValidationError({'detail': 'Payment does not match this order.'})
        if order.payment_status == 'Paid':
            if order.payment_id == data['razorpay_payment_id']:
                return Response(OrderSerializer(order).data)
            return Response({'detail': 'This order has already been paid.'}, status=status.HTTP_409_CONFLICT)
        if order.payment_status != 'Pending' or order.status != 'Pending':
            return Response({'detail': 'This order is no longer awaiting payment.'}, status=status.HTTP_409_CONFLICT)

        client = PaymentOrderCreateAPIView._get_client()
        if isinstance(client, Response):
            return client

        try:
            client.utility.verify_payment_signature({
                'razorpay_order_id': data['razorpay_order_id'],
                'razorpay_payment_id': data['razorpay_payment_id'],
                'razorpay_signature': data['razorpay_signature'],
            })
            payment = client.payment.fetch(data['razorpay_payment_id'])
        except Exception:
            logger.exception('Razorpay payment verification failed for order %s.', order.order_number)
            return Response({'detail': 'Payment verification failed. Please contact support if charged.'},
                            status=status.HTTP_400_BAD_REQUEST)

        if (
            payment.get('order_id') != order.payment_provider_order_id
            or int(payment.get('amount', -1)) != int(order.total_price * 100)
        ):
            return Response({'detail': 'Payment details do not match the order.'}, status=status.HTTP_400_BAD_REQUEST)
        if payment.get('status') != 'captured':
            return Response(
                {'detail': 'Payment is still pending provider confirmation. Please check order history shortly.'},
                status=status.HTTP_202_ACCEPTED,
            )

        with transaction.atomic():
            order = Order.objects.select_for_update().get(pk=order.pk)
            if order.payment_status == 'Paid':
                if order.payment_id == data['razorpay_payment_id']:
                    return Response(OrderSerializer(order).data)
                return Response({'detail': 'This order has already been paid.'}, status=status.HTTP_409_CONFLICT)
            if order.payment_status != 'Pending' or order.status != 'Pending':
                return Response({'detail': 'This order is no longer awaiting payment.'}, status=status.HTTP_409_CONFLICT)

            order.payment_status = 'Paid'
            order.payment_id = data['razorpay_payment_id']
            order.status = 'Confirmed'
            order.save(update_fields=['payment_status', 'payment_id', 'status', 'updated_at'])
            order.items.update(status='Confirmed')

        return Response(OrderSerializer(order).data)


class PaymentFailureAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PaymentFailureSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        order = get_object_or_404(Order, pk=data['order_id'], user=request.user)
        if order.payment_status in ['Failed', 'Cancelled']:
            return Response(OrderSerializer(order).data)
        if order.payment_status != 'Pending' or not order.payment_provider_order_id:
            return Response({'detail': 'This order is not awaiting payment.'}, status=status.HTTP_409_CONFLICT)

        client = PaymentOrderCreateAPIView._get_client()
        if isinstance(client, Response):
            return client
        try:
            payment = client.payment.fetch(data['razorpay_payment_id'])
        except Exception:
            logger.exception('Could not confirm failed Razorpay payment for order %s.', order.order_number)
            return Response({'detail': 'Unable to verify the payment failure with the provider.'},
                            status=status.HTTP_502_BAD_GATEWAY)
        if payment.get('order_id') != order.payment_provider_order_id or payment.get('status') != 'failed':
            return Response({'detail': 'The provider has not confirmed this payment as failed.'},
                            status=status.HTTP_409_CONFLICT)

        return self._release_order(order, 'Failed')

    @staticmethod
    def _release_order(order, payment_status):
        with transaction.atomic():
            order = Order.objects.select_for_update().get(pk=order.pk)
            if order.payment_status == 'Paid':
                return Response({'detail': 'Paid orders cannot be cancelled without a refund.'},
                                status=status.HTTP_409_CONFLICT)
            if order.payment_status in ['Failed', 'Cancelled']:
                return Response(OrderSerializer(order).data)
            if order.payment_status != 'Pending':
                return Response({'detail': 'This order is not awaiting payment.'}, status=status.HTTP_409_CONFLICT)
            for item in order.items.select_for_update().select_related('product'):
                if item.product:
                    product = Product.objects.select_for_update().get(pk=item.product_id)
                    product.stock += item.quantity
                    product.save(update_fields=['stock'])
                    StockMovement.objects.create(
                        product=product,
                        movement_type='RETURN',
                        quantity=item.quantity,
                        balance_after=product.stock,
                        reason=f'{payment_status} Razorpay checkout for Order #{order.order_number}',
                    )
            order.payment_status = payment_status
            order.status = 'Cancelled'
            order.save(update_fields=['payment_status', 'status', 'updated_at'])
        return Response(OrderSerializer(order).data)


class PaymentCancelAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        order = get_object_or_404(Order, pk=pk, user=request.user)
        if order.payment_status in ['Cancelled', 'Failed']:
            return Response(OrderSerializer(order).data)
        if order.payment_status == 'Paid':
            return Response({'detail': 'Paid orders require a verified refund before cancellation.'},
                            status=status.HTTP_409_CONFLICT)
        if order.payment_status != 'Pending':
            return Response({'detail': 'This order is not awaiting payment.'}, status=status.HTTP_409_CONFLICT)

        if order.payment_provider_order_id:
            client = PaymentOrderCreateAPIView._get_client()
            if isinstance(client, Response):
                return client
            try:
                provider_payments = client.order.payments(order.payment_provider_order_id)
            except Exception:
                logger.exception('Could not confirm Razorpay order state for cancellation of %s.', order.order_number)
                return Response({'detail': 'Unable to verify payment status. The order remains pending.'},
                                status=status.HTTP_502_BAD_GATEWAY)
            payments = provider_payments.get('items', [])
            if any(payment.get('status') not in ['failed'] for payment in payments):
                return Response({'detail': 'A payment is still processing. The order remains pending.'},
                                status=status.HTTP_409_CONFLICT)
        return PaymentFailureAPIView._release_order(order, 'Cancelled')


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def payment_webhook(request):
    webhook_secret = os.getenv('RAZORPAY_WEBHOOK_SECRET', '').strip()
    if not webhook_secret:
        return Response({'detail': 'Payment webhook is not configured.'},
                        status=status.HTTP_503_SERVICE_UNAVAILABLE)

    signature = request.headers.get('X-Razorpay-Signature', '')
    expected_signature = hmac.new(
        webhook_secret.encode(),
        request.body,
        hashlib.sha256,
    ).hexdigest()
    if not signature or not hmac.compare_digest(signature, expected_signature):
        return Response({'detail': 'Invalid payment webhook signature.'}, status=status.HTTP_400_BAD_REQUEST)

    event = request.data.get('event')
    payment = request.data.get('payload', {}).get('payment', {}).get('entity', {})
    provider_order_id = payment.get('order_id')
    if event not in ['payment.captured', 'payment.failed'] or not provider_order_id:
        return Response({'received': True})

    order = Order.objects.filter(payment_provider_order_id=provider_order_id).first()
    if not order:
        logger.warning('Razorpay webhook referred to an unknown payment order.')
        return Response({'received': True})

    if int(payment.get('amount', -1)) != int(order.total_price * 100):
        logger.error('Razorpay webhook amount did not match order %s.', order.order_number)
        return Response({'detail': 'Payment amount does not match the order.'},
                        status=status.HTTP_400_BAD_REQUEST)

    if event == 'payment.captured':
        payment_id = payment.get('id', '')
        with transaction.atomic():
            order = Order.objects.select_for_update().get(pk=order.pk)
            if order.payment_status in ['Paid', 'RefundRequired']:
                if order.payment_id == payment_id:
                    return Response({'received': True})
                return Response({'detail': 'Order has a different captured payment.'},
                                status=status.HTTP_409_CONFLICT)
            if order.payment_status not in ['Pending', 'Cancelled', 'Failed']:
                return Response({'detail': 'Order is not in a payable state.'},
                                status=status.HTTP_409_CONFLICT)
            if order.status in ['Cancelled'] or order.payment_status in ['Cancelled', 'Failed']:
                logger.error('Payment captured after order %s was released; manual refund review required.',
                             order.order_number)
                order.payment_status = 'RefundRequired'
                order.payment_id = payment_id
                order.status = 'Cancelled'
                order.save(update_fields=['payment_status', 'payment_id', 'status', 'updated_at'])
                return Response({'received': True})
            order.payment_status = 'Paid'
            order.payment_id = payment_id
            if order.status != 'Cancelled':
                order.status = 'Confirmed'
                order.items.update(status='Confirmed')
            order.save(update_fields=['payment_status', 'payment_id', 'status', 'updated_at'])
        return Response({'received': True})

    if payment.get('status') == 'failed' and order.payment_status == 'Pending':
        return PaymentFailureAPIView._release_order(order, 'Failed')
    return Response({'received': True})


# 8. Stock Movements & Daily Chart Data (Admin Staff Only)
class StockMovementListAPIView(APIView):
    permission_classes = [IsAdminUserOnly]

    def get(self, request):
        days = int(request.query_params.get('days', 14))
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)

        movements = StockMovement.objects.filter(
            created_at__gte=start_date
        ).order_by('-created_at')

        serializer = StockMovementSerializer(movements, many=True)

        daily_stats = []
        for i in range(days):
            current_day = (start_date + timedelta(days=i)).date()
            day_start = timezone.datetime.combine(current_day, timezone.datetime.min.time(), tzinfo=timezone.get_current_timezone())
            day_end = timezone.datetime.combine(current_day, timezone.datetime.max.time(), tzinfo=timezone.get_current_timezone())

            day_moves = StockMovement.objects.filter(created_at__range=(day_start, day_end))
            
            inflow = sum(m.quantity for m in day_moves if m.movement_type in ['IN', 'RETURN'])
            outflow = sum(m.quantity for m in day_moves if m.movement_type == 'OUT')

            daily_stats.append({
                'date': current_day.strftime('%b %d'),
                'rawDate': current_day.isoformat(),
                'inflow': inflow,
                'outflow': outflow,
                'net': inflow - outflow,
            })

        total_items_in_stock = Product.objects.aggregate(total_stock=Sum('stock'))['total_stock'] or 0
        total_products_count = Product.objects.count()
        low_stock_products = Product.objects.filter(stock__lte=5).values('id', 'name', 'stock', 'slug')

        return Response({
            'dailyChart': daily_stats,
            'recentMovements': serializer.data[:30],
            'totalInventoryCount': total_items_in_stock,
            'totalProductsCount': total_products_count,
            'lowStockAlerts': list(low_stock_products),
        })


# 9. Admin Stats Overview (Admin Staff Only)
class AdminStatsAPIView(APIView):
    permission_classes = [IsAdminUserOnly]

    def get(self, request):
        total_products = Product.objects.count()
        total_orders = Order.objects.count()
        active_orders = Order.objects.filter(payment_status='Paid').exclude(status='Cancelled').count()
        
        revenue_data = Order.objects.filter(payment_status='Paid').exclude(status='Cancelled').aggregate(total_rev=Sum('total_price'))
        total_revenue = revenue_data['total_rev'] or 0

        inventory_value = sum(p.price * p.stock for p in Product.objects.all())

        return Response({
            'totalProducts': total_products,
            'totalOrders': total_orders,
            'activeOrders': active_orders,
            'pendingPayments': Order.objects.filter(payment_status='Pending').count(),
            'totalRevenue': float(total_revenue),
            'inventoryValue': float(inventory_value),
        })


# 10. API Root
@api_view(['GET'])
@permission_classes([AllowAny])
def api_root(request):
    return Response({
        "status": "online",
        "service": "Lumière Fine Jewelry API",
        "version": "1.0.0"
    })


# 11. User Registration
class RegisterAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserRegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            token, _ = Token.objects.get_or_create(user=user)
            return Response({
                "message": "Account created successfully!",
                "token": token.key,
                "user": UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
        
        errors = serializer.errors
        error_msg = "Registration failed."
        if isinstance(errors, dict):
            first_field = next(iter(errors))
            first_error = errors[first_field]
            if isinstance(first_error, list) and len(first_error) > 0:
                error_msg = f"{first_error[0]}"
            else:
                error_msg = f"{first_error}"
        return Response({
            "message": error_msg,
            "errors": errors
        }, status=status.HTTP_400_BAD_REQUEST)


# 12. User Login
class LoginAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email_or_username = (
            request.data.get('email')
            or request.data.get('username')
            or ''
        ).strip()
        password = request.data.get('password', '')

        if not email_or_username or not password:
            return Response({
                "message": "Please provide both email and password."
            }, status=status.HTTP_400_BAD_REQUEST)

        user = None
        # Try direct username authentication first
        user = authenticate(username=email_or_username, password=password)

        # If not matched, try looking up User by email or case-insensitive username
        if not user:
            user_obj = User.objects.filter(email__iexact=email_or_username).first()
            if not user_obj:
                user_obj = User.objects.filter(username__iexact=email_or_username).first()
            if user_obj:
                user = authenticate(username=user_obj.username, password=password)

        if user:
            if not user.is_active:
                return Response({
                    "message": "This account is inactive."
                }, status=status.HTTP_400_BAD_REQUEST)
            
            token, _ = Token.objects.get_or_create(user=user)
            return Response({
                "message": "Welcome back! Login successful.",
                "token": token.key,
                "user": UserSerializer(user).data
            }, status=status.HTTP_200_OK)

        return Response({
            "message": "Invalid email or password."
        }, status=status.HTTP_400_BAD_REQUEST)



# 13. User Profile (View and Update)
class UserProfileAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response({
            "user": serializer.data
        }, status=status.HTTP_200_OK)

    def patch(self, request):
        serializer = UserProfileUpdateSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            user = serializer.save()
            return Response({
                "message": "Profile updated successfully.",
                "user": UserSerializer(user).data
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# 14. Change Password
class ChangePasswordAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            new_password = serializer.validated_data['new_password']
            user = request.user
            user.set_password(new_password)
            user.save()

            # Refresh token after password change
            Token.objects.filter(user=user).delete()
            new_token = Token.objects.create(user=user)

            return Response({
                "message": "Password updated successfully.",
                "token": new_token.key
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# 15. User Logout
class LogoutAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        if request.user and request.user.is_authenticated:
            try:
                request.user.auth_token.delete()
            except Exception:
                pass
        return Response({
            "message": "Logged out successfully."
        }, status=status.HTTP_200_OK)