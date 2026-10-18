from django.db import models
from django.contrib.auth.models import User
from django.utils.text import slugify
from .validators import validate_image_file

class Category(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Product(models.Model):
    category = models.ForeignKey(Category, related_name='products', on_delete=models.CASCADE)
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True, blank=True)
    description = models.TextField(blank=True, default='')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    material = models.CharField(max_length=100, default="18k Gold")
    gemstone = models.CharField(max_length=100, blank=True, null=True)
    image = models.ImageField(upload_to='products/', blank=True, null=True, validators=[validate_image_file])
    stock = models.IntegerField(default=15)
    is_featured = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1
            while Product.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Review(models.Model):
    product = models.ForeignKey(Product, related_name='reviews', on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviews')
    author_name = models.CharField(max_length=100)
    rating = models.IntegerField(default=5)
    title = models.CharField(max_length=200)
    comment = models.TextField()
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} - {self.author_name} ({self.product.name})"


class Order(models.Model):
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Confirmed', 'Confirmed'),
        ('Processing', 'Processing'),
        ('Shipped', 'Shipped'),
        ('Delivered', 'Delivered'),
        ('Cancelled', 'Cancelled'),
    ]
    PAYMENT_STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Paid', 'Paid'),
        ('Failed', 'Failed'),
        ('Cancelled', 'Cancelled'),
        ('RefundRequired', 'Refund required'),
    ]

    order_number = models.CharField(max_length=50, unique=True)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='orders')
    customer_name = models.CharField(max_length=150, default='Valued Client')
    customer_email = models.EmailField(blank=True, null=True)
    customer_phone = models.CharField(max_length=25, blank=True, default='')
    shipping_address = models.TextField(blank=True, default='')
    shipping_city = models.CharField(max_length=100, blank=True, default='')
    shipping_postal_code = models.CharField(max_length=20, blank=True, default='')
    shipping_country = models.CharField(max_length=100, blank=True, default='India')
    payment_method = models.CharField(max_length=50, default='Razorpay')
    payment_status = models.CharField(max_length=30, choices=PAYMENT_STATUS_CHOICES, default='Pending')
    payment_provider_order_id = models.CharField(max_length=64, blank=True, default='')
    payment_id = models.CharField(max_length=64, blank=True, default='')
    idempotency_key = models.CharField(max_length=64, unique=True, null=True, blank=True)
    total_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='Pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Order #{self.order_number} - {self.customer_name} ({self.status})"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, related_name='order_items', on_delete=models.SET_NULL, null=True, blank=True)
    product_name = models.CharField(max_length=200)
    product_image = models.CharField(max_length=500, blank=True, null=True)
    quantity = models.IntegerField(default=1)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    metal = models.CharField(max_length=100, default='18k Yellow Gold')
    size = models.CharField(max_length=20, blank=True, null=True)
    status = models.CharField(max_length=30, default='Confirmed')

    def __str__(self):
        return f"{self.quantity}x {self.product_name} in #{self.order.order_number}"


class StockMovement(models.Model):
    MOVEMENT_TYPES = [
        ('IN', 'Stock Received / Added'),
        ('OUT', 'Sold / Purchased'),
        ('ADJUST', 'Inventory Adjustment'),
        ('RETURN', 'Order Returned / Restocked'),
    ]

    product = models.ForeignKey(Product, related_name='stock_movements', on_delete=models.CASCADE)
    movement_type = models.CharField(max_length=20, choices=MOVEMENT_TYPES)
    quantity = models.IntegerField()
    balance_after = models.IntegerField(default=0)
    reason = models.CharField(max_length=255, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.product.name} ({self.movement_type} {self.quantity}) at {self.created_at.strftime('%Y-%m-%d')}"