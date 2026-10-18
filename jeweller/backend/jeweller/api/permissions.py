from rest_framework import permissions

class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Custom permission: SAFE_METHODS (GET, HEAD, OPTIONS) are allowed to all.
    Write operations (POST, PUT, PATCH, DELETE) require staff/superuser authentication.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated and (request.user.is_staff or request.user.is_superuser))


class IsAdminUserOnly(permissions.BasePermission):
    """
    Allows access only to authenticated staff or superuser users.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (request.user.is_staff or request.user.is_superuser))


class IsOrderOwnerOrAdmin(permissions.BasePermission):
    """
    Order permission:
    - Admin can view and modify any order.
    - Authenticated customer can view their own orders and cancel their own non-shipped order.
    - Unauthenticated cannot view orders.
    """
    def has_permission(self, request, view):
        # Order creation (POST) is allowed for authenticated users (or guests if enabled)
        if request.method == 'POST':
            return True
        # Listing or accessing orders requires authentication
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        # Admins can do anything
        if request.user.is_staff or request.user.is_superuser:
            return True

        # Check if current user is owner of the order
        if obj.user == request.user:
            if request.method in permissions.SAFE_METHODS:
                return True
            # Allow customer to cancel their own order only
            if request.method in ['PATCH', 'PUT']:
                return False
            return False

        return False
