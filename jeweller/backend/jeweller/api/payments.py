import os

from django.core.exceptions import ImproperlyConfigured


def get_razorpay_key_id():
    return os.getenv('RAZORPAY_KEY_ID', '').strip()


def payments_enabled():
    key_id = get_razorpay_key_id()
    secret = os.getenv('RAZORPAY_KEY_SECRET', '').strip()
    return bool(key_id.startswith('rzp_test_') and secret)


def get_razorpay_client():
    key_id = get_razorpay_key_id()
    secret = os.getenv('RAZORPAY_KEY_SECRET', '').strip()
    if not key_id.startswith('rzp_test_') or not secret:
        raise ImproperlyConfigured(
            'Razorpay test credentials are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.'
        )
    import razorpay

    return razorpay.Client(auth=(key_id, secret))
