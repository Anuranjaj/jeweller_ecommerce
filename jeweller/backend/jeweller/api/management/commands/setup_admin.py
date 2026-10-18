import os
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from api.models import Category, Product, StockMovement


class Command(BaseCommand):
    help = "Seeds or updates administrator account and initializes the fine jewelry catalog."

    def handle(self, *args, **options):
        # 1. Administrator Setup
        admin_email = os.getenv('ADMIN_EMAIL', 'admin@gmail.com').strip()
        admin_password = os.getenv('ADMIN_PASSWORD', 'Admin@123').strip()

        user, created = User.objects.get_or_create(username=admin_email)
        user.email = admin_email
        user.first_name = "Lumière Administrator"
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.set_password(admin_password)
        user.save()

        token, _ = Token.objects.get_or_create(user=user)
        self.stdout.write(self.style.SUCCESS(
            f"Admin account configured: {admin_email} (Staff: True, Superuser: True) with token {token.key[:8]}..."
        ))

        # 2. Category Normalization
        categories_data = [
            ("Rings", "rings"),
            ("Earrings", "earrings"),
            ("Necklaces", "necklaces"),
            ("Bracelets", "bracelets"),
        ]

        # Update legacy "necklace" slug to "necklaces"
        legacy_necklace = Category.objects.filter(slug='necklace').first()
        if legacy_necklace:
            legacy_necklace.name = "Necklaces"
            legacy_necklace.slug = "necklaces"
            legacy_necklace.save()
            self.stdout.write("Updated legacy category 'necklace' -> 'necklaces'")

        category_objs = {}
        for name, slug in categories_data:
            cat, _ = Category.objects.get_or_create(slug=slug, defaults={'name': name})
            if cat.name != name:
                cat.name = name
                cat.save()
            category_objs[slug] = cat

        # 3. Enrich Luxury Jewelry Catalog
        new_pieces = [
            {
                'category': category_objs['rings'],
                'name': 'Celestial Solitaire Diamond Ring',
                'slug': 'celestial-solitaire-diamond-ring',
                'description': 'A breathtaking round-cut solitaire diamond nestled within a delicate micro-pavé diamond halo and 18-karat yellow gold band. A statement of eternal devotion.',
                'price': Decimal('68000.00'),
                'material': '18k Yellow Gold',
                'gemstone': '1.2 Carat VVS1 Diamond',
                'image': 'products/ring-solitaire.png',
                'stock': 12,
                'is_featured': True,
            },
            {
                'category': category_objs['rings'],
                'name': 'Entwined Waves Diamond Ring',
                'slug': 'entwined-waves-diamond-ring',
                'description': 'Architectural ribbons of warm rose gold and channel-set brilliant diamonds dance across the finger in a mesmerizing wave silhouette.',
                'price': Decimal('42000.00'),
                'material': '18k Rose Gold',
                'gemstone': '0.45 Carat Brilliant Diamonds',
                'image': 'products/ring-3-4-26.webp',
                'stock': 15,
                'is_featured': True,
            },
            {
                'category': category_objs['earrings'],
                'name': 'Sculpted Geometric Gold Tassel Drops',
                'slug': 'sculpted-geometric-gold-tassel-drops',
                'description': 'Intricately hand-woven 22-karat gold mesh tassels suspend from textured oval studs, catching every flicker of evening light with effortless grace.',
                'price': Decimal('54000.00'),
                'material': '22k Yellow Gold',
                'gemstone': 'Hand-Carved Gold',
                'image': 'products/earrings-3-4-26.webp',
                'stock': 10,
                'is_featured': True,
            },
            {
                'category': category_objs['necklaces'],
                'name': 'Cascading Heart Lariat Necklace',
                'slug': 'cascading-heart-lariat-necklace',
                'description': 'A contemporary lariat necklace featuring diamond-cut rose gold droplets that cascade gracefully from a pavé diamond heart slide.',
                'price': Decimal('95000.00'),
                'material': '18k Rose Gold',
                'gemstone': '0.60 Carat Pavé Diamonds',
                'image': 'products/chains-3-4-26.webp',
                'stock': 8,
                'is_featured': True,
            },
            {
                'category': category_objs['necklaces'],
                'name': 'Art Deco Luminary Diamond Pendant',
                'slug': 'art-deco-luminary-diamond-pendant',
                'description': 'A geometric triangle pendant suspended from an 18-karat gold chain, accented with concentric tiers of pavé diamonds inspired by Parisian architecture.',
                'price': Decimal('72000.00'),
                'material': '18k Yellow Gold',
                'gemstone': '0.75 Carat Brilliant Diamonds',
                'image': 'products/pendants-3-4-26.webp',
                'stock': 14,
                'is_featured': True,
            },
            {
                'category': category_objs['necklaces'],
                'name': 'Auspicious Heritage Floral Mangalsutra',
                'slug': 'auspicious-heritage-floral-mangalsutra',
                'description': 'Traditional sacred black onyx beads interwoven with delicate 22-karat gold filigree and an ornate floral blossom tassel pendant.',
                'price': Decimal('88000.00'),
                'material': '22k Yellow Gold',
                'gemstone': 'Natural Black Onyx Beads',
                'image': 'products/mangalsutra-3-4-26.webp',
                'stock': 7,
                'is_featured': False,
            },
            {
                'category': category_objs['bracelets'],
                'name': 'Aura Geometric Diamond Cuff Bangle',
                'slug': 'aura-geometric-diamond-cuff-bangle',
                'description': 'A sleek, open-cuff bangle in polished rose gold crowned by a contemporary geometric zig-zag motif encrusted with channel-set diamonds.',
                'price': Decimal('110000.00'),
                'material': '18k Rose Gold',
                'gemstone': '0.85 Carat Diamonds',
                'image': 'products/bangles-3-4-26.webp',
                'stock': 9,
                'is_featured': True,
            },
            {
                'category': category_objs['bracelets'],
                'name': 'Celestial Sunburst Medallion Bracelet',
                'slug': 'celestial-sunburst-medallion-bracelet',
                'description': 'A delicate link chain bracelet centering an intricately open-worked gold sunburst medallion with shimmering diamond accents.',
                'price': Decimal('68000.00'),
                'material': '18k Yellow Gold',
                'gemstone': '0.35 Carat Accent Diamonds',
                'image': 'products/bracelets-3-4-26.webp',
                'stock': 11,
                'is_featured': True,
            },
        ]

        added_count = 0
        for piece in new_pieces:
            slug = piece['slug']
            prod = Product.objects.filter(slug=slug).first()
            if not prod:
                prod = Product.objects.create(**piece)
                StockMovement.objects.create(
                    product=prod,
                    movement_type='IN',
                    quantity=piece['stock'],
                    balance_after=piece['stock'],
                    reason='Boutique Curation Launch'
                )
                added_count += 1
            else:
                # Update image and details if needed
                for key, val in piece.items():
                    setattr(prod, key, val)
                prod.save()

        # Mark key original products as featured
        Product.objects.filter(id__in=[1, 4]).update(is_featured=True)

        self.stdout.write(self.style.SUCCESS(
            f"Successfully updated catalog! Added/Refreshed {added_count} luxury pieces. Total products in catalog: {Product.objects.count()}."
        ))
