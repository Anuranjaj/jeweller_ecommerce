from django.utils.text import slugify
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from .models import Product, Category, Review, Order, OrderItem, StockMovement
from .validators import validate_image_file


class ReviewSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Review
        fields = ['id', 'product', 'user', 'author_name', 'rating', 'title', 'comment', 'is_verified', 'created_at']
        read_only_fields = ['product', 'user', 'is_verified', 'created_at']

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value

    def validate_title(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Review title cannot be empty.")
        return value.strip()

    def validate_comment(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Review comment cannot be empty.")
        return value.strip()


class CategorySerializer(serializers.ModelSerializer):
    slug = serializers.SlugField(required=False, allow_blank=True)

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug']

    def create(self, validated_data):
        if not validated_data.get('slug'):
            validated_data['slug'] = slugify(validated_data['name'])
        return super().create(validated_data)


class ProductSerializers(serializers.ModelSerializer):
    reviews = ReviewSerializer(many=True, read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_slug = serializers.CharField(source='category.slug', read_only=True)
    avg_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = '__all__'

    def get_avg_rating(self, obj):
        reviews = obj.reviews.all()
        if not reviews.exists():
            return 5.0
        return round(sum(r.rating for r in reviews) / reviews.count(), 1)

    def get_review_count(self, obj):
        return obj.reviews.count()


class ProductCreateUpdateSerializer(serializers.ModelSerializer):
    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), 
        required=False
    )
    category_name = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Product
        fields = '__all__'
        extra_kwargs = {
            'slug': {'required': False},
            'description': {'required': False},
        }

    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Price must be a positive number.")
        return value

    def validate_stock(self, value):
        if value < 0:
            raise serializers.ValidationError("Stock level cannot be negative.")
        return value

    def validate_image(self, value):
        if value:
            validate_image_file(value)
        return value

    def create(self, validated_data):
        category_name = validated_data.pop('category_name', None)
        if not validated_data.get('category') and category_name:
            category, _ = Category.objects.get_or_create(name=category_name.strip())
            validated_data['category'] = category
        elif not validated_data.get('category'):
            category = Category.objects.first()
            if not category:
                category = Category.objects.create(name="Rings", slug="rings")
            validated_data['category'] = category

        initial_stock = validated_data.get('stock', 15)
        product = Product.objects.create(**validated_data)

        # Record Initial Stock Movement
        StockMovement.objects.create(
            product=product,
            movement_type='IN',
            quantity=initial_stock,
            balance_after=initial_stock,
            reason='Initial Product Listing'
        )
        return product

    def update(self, instance, validated_data):
        old_stock = instance.stock
        new_stock = validated_data.get('stock', old_stock)

        product = super().update(instance, validated_data)

        if old_stock != new_stock:
            diff = new_stock - old_stock
            m_type = 'IN' if diff > 0 else 'ADJUST'
            StockMovement.objects.create(
                product=product,
                movement_type=m_type,
                quantity=abs(diff),
                balance_after=new_stock,
                reason='Admin Inventory Adjustment'
            )
        return product


class OrderItemSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    product_name = serializers.CharField(required=False, allow_blank=True)
    product_slug = serializers.CharField(source='product.slug', read_only=True)
    price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_name', 'product_slug', 'product_image', 'quantity', 'price', 'metal', 'size', 'status']



class PaymentOrderItemInputSerializer(serializers.Serializer):
    id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1, max_value=100)
    metal = serializers.CharField(max_length=100, required=False, allow_blank=True)
    size = serializers.CharField(max_length=20, required=False, allow_blank=True)


class PaymentOrderCreateSerializer(serializers.Serializer):
    items = PaymentOrderItemInputSerializer(many=True, allow_empty=False)
    customer_phone = serializers.CharField(max_length=25)
    shipping_address = serializers.CharField(max_length=2000)
    shipping_city = serializers.CharField(max_length=100)
    shipping_postal_code = serializers.CharField(max_length=20)
    shipping_country = serializers.CharField(max_length=100, default='India')


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, required=False)

    class Meta:
        model = Order
        fields = [
            'id', 
            'order_number', 
            'user', 
            'customer_name', 
            'customer_email', 
            'customer_phone',
            'shipping_address',
            'shipping_city',
            'shipping_postal_code',
            'shipping_country',
            'payment_method',
            'payment_status',
            'total_price', 
            'status', 
            'created_at', 
            'updated_at', 
            'items'
        ]
        read_only_fields = [
            'order_number',
            'user',
            'payment_method',
            'payment_status',
            'payment_provider_order_id',
            'payment_id',
            'idempotency_key',
            'total_price',
            'created_at',
            'updated_at',
        ]

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get('request')
        if self.instance:
            fields['items'].read_only = True
            if not request or not (request.user.is_staff or request.user.is_superuser):
                fields['status'].read_only = True
        return fields

    def validate_status(self, value):
        if self.instance and self.instance.payment_status == 'Paid' and value == 'Cancelled':
            raise serializers.ValidationError("Paid orders require a verified refund before cancellation.")
        if self.instance and value not in ['Pending', 'Cancelled'] and self.instance.payment_status != 'Paid':
            raise serializers.ValidationError("An order can be processed only after its payment is verified.")
        return value


class PaymentVerificationSerializer(serializers.Serializer):
    order_id = serializers.IntegerField(min_value=1)
    razorpay_order_id = serializers.CharField(max_length=64)
    razorpay_payment_id = serializers.CharField(max_length=64)
    razorpay_signature = serializers.CharField(max_length=256)


class PaymentFailureSerializer(serializers.Serializer):
    order_id = serializers.IntegerField(min_value=1)
    razorpay_payment_id = serializers.CharField(max_length=64)


class StockMovementSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_slug = serializers.CharField(source='product.slug', read_only=True)
    product_image = serializers.SerializerMethodField()

    class Meta:
        model = StockMovement
        fields = ['id', 'product', 'product_name', 'product_slug', 'product_image', 'movement_type', 'quantity', 'balance_after', 'reason', 'created_at']

    def get_product_image(self, obj):
        if obj.product and obj.product.image:
            return obj.product.image.url
        return None


class UserSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'name', 'first_name', 'last_name', 'is_staff', 'is_superuser']

    def get_name(self, obj):
        if obj.first_name:
            if obj.last_name:
                return f"{obj.first_name} {obj.last_name}".strip()
            return obj.first_name
        return obj.username


class UserRegisterSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150, required=True)
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, min_length=8, required=True)

    def validate_email(self, value):
        normalized_email = value.strip().lower()
        if User.objects.filter(email__iexact=normalized_email).exists() or User.objects.filter(username__iexact=normalized_email).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return normalized_email

    def validate_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as error:
            raise serializers.ValidationError(error.messages)
        return value

    def create(self, validated_data):
        email = validated_data['email']
        name = validated_data['name'].strip()
        password = validated_data['password']

        user = User.objects.create_user(
            username=email,
            email=email,
            first_name=name,
            password=password
        )
        return user


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, min_length=8, write_only=True)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is not correct.")
        return value

    def validate_new_password(self, value):
        try:
            validate_password(value, user=self.context['request'].user)
        except DjangoValidationError as error:
            raise serializers.ValidationError(error.messages)
        return value


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email']

    def validate_email(self, value):
        user = self.instance
        normalized = value.strip().lower()
        if User.objects.filter(email__iexact=normalized).exclude(pk=user.pk).exists():
            raise serializers.ValidationError("This email is already in use by another account.")
        return normalized
