import os
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'jeweller.settings')
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'jeweller'))

import django
django.setup()

from api.models import Category, Product

print("CATEGORIES:")
for c in Category.objects.all():
    print(f"  ID: {c.id}, Name: {c.name}, Slug: {c.slug}, Products count: {c.products.count()}")

print("\nPRODUCTS:")
for p in Product.objects.all():
    img_exists = False
    if p.image:
        full_path = os.path.join(os.path.dirname(__file__), 'jeweller', str(p.image).lstrip('/'))
        img_exists = os.path.exists(full_path)
    print(f"  ID: {p.id}, Name: '{p.name}', Category: {p.category.name} ({p.category.slug}), Image: '{p.image}', Exists: {img_exists}, Price: {p.price}, Stock: {p.stock}, Featured: {p.is_featured}")
