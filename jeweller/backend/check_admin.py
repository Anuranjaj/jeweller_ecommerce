import os
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'jeweller.settings')
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'jeweller'))

import django
django.setup()

from django.contrib.auth.models import User

for u in User.objects.all():
    print(f"User: {u.username}, email: {u.email}, is_staff: {u.is_staff}, is_superuser: {u.is_superuser}, has_pw: {u.has_usable_password()}, pw_hash: {u.password}")

