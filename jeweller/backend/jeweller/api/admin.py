from django.contrib import admin
from .models import Category, Product, Review

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'slug')
    search_fields = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}
    ordering = ('name',)

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'price', 'is_featured', 'created_at')
    list_filter = ('is_featured', 'category')
    search_fields = ('name', 'description')
    prepopulated_fields = {'slug': ('name',)}
    autocomplete_fields = ['category']  

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('title', 'author_name', 'product', 'rating', 'created_at')
    list_filter = ('rating', 'is_verified', 'created_at')
    search_fields = ('title', 'author_name', 'comment')