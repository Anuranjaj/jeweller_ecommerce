from django.urls import path
from .views import (
    ProductListAPIView, 
    ProductDetailAPIView, 
    ProductReviewListCreateAPIView,
    VerifyProductPurchaseAPIView,
    FeaturedProductListAPIView,
    CategoryListAPIView,
    OrderListCreateAPIView,
    OrderDetailUpdateAPIView,
    StockMovementListAPIView,
    AdminStatsAPIView,
    RegisterAPIView,
    LoginAPIView,
    LogoutAPIView,
    UserProfileAPIView,
    ChangePasswordAPIView,
    PaymentConfigAPIView,
    PaymentOrderCreateAPIView,
    PaymentVerifyAPIView,
    PaymentFailureAPIView,
    PaymentCancelAPIView,
    payment_webhook,
)

urlpatterns = [
    # Authentication & User Management
    path('register/', RegisterAPIView.as_view(), name='register'),
    path('login/', LoginAPIView.as_view(), name='login'),
    path('logout/', LogoutAPIView.as_view(), name='logout'),
    path('user/', UserProfileAPIView.as_view(), name='user-profile'),
    path('change-password/', ChangePasswordAPIView.as_view(), name='change-password'),

    # Products & Categories
    path('categories/', CategoryListAPIView.as_view(), name='category-list'),
    path('products/', ProductListAPIView.as_view(), name='product-list'),
    path('products/featured/', FeaturedProductListAPIView.as_view(), name='featured-products'),
    path('products/<slug:slug>/', ProductDetailAPIView.as_view(), name='product-detail'),
    path('products/<slug:slug>/reviews/', ProductReviewListCreateAPIView.as_view(), name='product-reviews'),
    path('products/<slug:slug>/check-purchased/', VerifyProductPurchaseAPIView.as_view(), name='product-check-purchased'),

    # Orders (Customer Isolation & Admin Management)
    path('orders/', OrderListCreateAPIView.as_view(), name='order-list-create'),
    path('orders/<str:pk_or_number>/', OrderDetailUpdateAPIView.as_view(), name='order-detail-update'),
    path('payments/config/', PaymentConfigAPIView.as_view(), name='payment-config'),
    path('payments/orders/', PaymentOrderCreateAPIView.as_view(), name='payment-order-create'),
    path('payments/verify/', PaymentVerifyAPIView.as_view(), name='payment-verify'),
    path('payments/failure/', PaymentFailureAPIView.as_view(), name='payment-failure'),
    path('payments/orders/<int:pk>/cancel/', PaymentCancelAPIView.as_view(), name='payment-order-cancel'),
    path('payments/webhook/', payment_webhook, name='payment-webhook'),

    # Stock Movements & Admin Analytics
    path('stock/movements/', StockMovementListAPIView.as_view(), name='stock-movements'),
    path('admin/stats/', AdminStatsAPIView.as_view(), name='admin-stats'),
]
