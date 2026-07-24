/**
 * Seed script for She2Be grocery platform.
 *
 * Usage:
 *   bun run prisma/seed.ts
 *
 * Seeds:
 *   - 10 categories (fresh produce, dairy, bakery, etc.)
 *   - ~5 brands
 *   - ~40 realistic grocery products with images, prices, units
 *   - 1 demo customer + 1 admin user (bcrypt-hashed passwords)
 *   - A few sample coupons
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

// --------------------------------------------------------------------
// Password hashing without requiring bcryptjs (use Node's scrypt via
// crypto). We expose hashes for demo accounts.
// --------------------------------------------------------------------
import { scryptSync, randomBytes } from 'crypto'

function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(plain, salt, 64).toString('hex')
  return `scrypt$${salt}$${hash}`
}

// --------------------------------------------------------------------
// Product image strategy:
//   - Use Unsplash Source URLs for stable, high-quality grocery imagery.
//   - These load real images at request time; no committed binaries.
// --------------------------------------------------------------------
const IMG = (q: string) =>
  `https://images.unsplash.com/${q}?auto=format&fit=crop&w=600&q=70`

// --------------------------------------------------------------------
// Seed data
// --------------------------------------------------------------------
async function main() {
  console.log('🌱 Seeding She2Be grocery platform...')

  // 1. Categories -----------------------------------------------------
  const categories = [
    { name: 'Fresh Produce', slug: 'fresh-produce', icon: '🥬', description: 'Farm-fresh fruits and vegetables, delivered daily.' },
    { name: 'Dairy & Eggs', slug: 'dairy-eggs', icon: '🥛', description: 'Milk, cheese, yogurt, and farm eggs.' },
    { name: 'Bakery', slug: 'bakery', icon: '🍞', description: 'Fresh breads, pastries, and baked goods.' },
    { name: 'Meat & Poultry', slug: 'meat-poultry', icon: '🍗', description: 'Premium cuts of meat and poultry.' },
    { name: 'Seafood', slug: 'seafood', icon: '🐟', description: 'Fresh and frozen seafood.' },
    { name: 'Pantry Staples', slug: 'pantry', icon: '🥫', description: 'Rice, pasta, oils, and everyday essentials.' },
    { name: 'Snacks & Candy', slug: 'snacks', icon: '🍫', description: 'Chips, chocolates, and sweet treats.' },
    { name: 'Beverages', slug: 'beverages', icon: '🥤', description: 'Juices, sodas, water, and tea.' },
    { name: 'Frozen Foods', slug: 'frozen', icon: '🧊', description: 'Frozen meals, vegetables, and desserts.' },
    { name: 'Household', slug: 'household', icon: '🧻', description: 'Cleaning supplies and home essentials.' },
  ] as const

  const categoryRecords = await Promise.all(
    categories.map((c, i) =>
      db.category.create({
        data: { ...c, sortOrder: i, isActive: true },
      })
    )
  )
  const cat = (slug: string) => categoryRecords.find((c) => c.slug === slug)!

  // 2. Brands ---------------------------------------------------------
  const brands = [
    { name: 'Farm Fresh', slug: 'farm-fresh', country: 'Egypt' },
    { name: 'Organic Valley', slug: 'organic-valley', country: 'USA' },
    { name: 'Local Harvest', slug: 'local-harvest', country: 'Egypt' },
    { name: 'Daily Dairy', slug: 'daily-dairy', country: 'Egypt' },
    { name: 'Premium Cuts', slug: 'premium-cuts', country: 'Egypt' },
  ]
  const brandRecords = await Promise.all(brands.map((b) => db.brand.create({ data: b })))
  const brand = (slug: string) => brandRecords.find((b) => b.slug === slug)!

  // 3. Products -------------------------------------------------------
  // [name, slug, categorySlug, brandSlug, price, unit, stock, image, opts?]
  type Seed = [
    string, string, string, string | null, number, string, number, string,
    Partial<{
      description: string
      longDescription: string
      isFeatured: boolean
      isOrganic: boolean
      isVegan: boolean
      compareAtPricePiasters: number
      sku: string
      barcode: string
    }>?
  ]

  const products: Seed[] = [
    // Fresh produce
    ['Organic Bananas', 'organic-bananas', 'fresh-produce', 'organic-valley', 3500, 'bunch (1kg)', 80, 'photo-1571771894821-ce9b6c11b08e', { isOrganic: true, isFeatured: true, isVegan: true, description: 'Sweet, ripe organic bananas. Perfect for snacking or smoothies.' }],
    ['Hass Avocados', 'hass-avocados', 'fresh-produce', 'farm-fresh', 8500, 'pack of 4', 40, 'photo-1601039641847-7857b994d704', { isFeatured: true, isVegan: true, compareAtPricePiasters: 10000, description: 'Creamy, ripe Hass avocados. Ready to eat.' }],
    ['Roma Tomatoes', 'roma-tomatoes', 'fresh-produce', 'farm-fresh', 2800, '500g', 120, 'photo-1592924357228-91a4daadcfea', { isVegan: true, description: 'Firm Roma tomatoes, ideal for salads and sauces.' }],
    ['Baby Spinach', 'baby-spinach', 'fresh-produce', 'organic-valley', 3200, '200g bag', 60, 'photo-1576045057995-568f588f82fb', { isOrganic: true, isVegan: true, description: 'Pre-washed organic baby spinach leaves.' }],
    ['Red Apples', 'red-apples', 'fresh-produce', 'local-harvest', 4500, '1kg bag', 90, 'photo-1568702846914-96b305d2aaeb', { isFeatured: true, isVegan: true, description: 'Crisp, sweet red apples. Great for snacking.' }],
    ['Carrots', 'carrots', 'fresh-produce', 'farm-fresh', 1800, '1kg', 150, 'photo-1598170845058-32b9d6a5da37', { isVegan: true, description: 'Fresh, crunchy carrots. Perfect for cooking or snacking.' }],
    ['Strawberries', 'strawberries', 'fresh-produce', 'local-harvest', 7500, '250g punnet', 35, 'photo-1464965911861-746a04b4bca6', { isFeatured: true, isVegan: true, description: 'Sweet, juicy strawberries. Limited season.' }],
    ['Lemons', 'lemons', 'fresh-produce', 'farm-fresh', 2200, '500g', 100, 'photo-1590502593747-42a996133562', { isVegan: true, description: 'Zesty fresh lemons for cooking and drinks.' }],

    // Dairy & eggs
    ['Whole Milk 1L', 'whole-milk-1l', 'dairy-eggs', 'daily-dairy', 3200, '1L', 70, 'photo-1550583724-b2692b85b150', { isFeatured: true, description: 'Fresh whole milk, pasteurized and homogenized.' }],
    ['Free-Range Eggs', 'free-range-eggs', 'dairy-eggs', 'farm-fresh', 6500, 'dozen', 50, 'photo-1582722872445-44dc5f7e3c8f', { isFeatured: true, description: 'Farm-fresh free-range eggs, large grade A.' }],
    ['Greek Yogurt', 'greek-yogurt', 'dairy-eggs', 'daily-dairy', 4500, '500g', 60, 'photo-1571212515416-fefbf9c5e0b4', { description: 'Thick, creamy Greek yogurt. High protein.' }],
    ['Cheddar Cheese', 'cheddar-cheese', 'dairy-eggs', 'daily-dairy', 8900, '250g block', 45, 'photo-1486297678162-eb2a19b0a32d', { description: 'Aged cheddar cheese, sharp and tangy.' }],
    ['Butter Unsalted', 'butter-unsalted', 'dairy-eggs', 'daily-dairy', 5200, '250g', 55, 'photo-1589985270826-4b7bb7bc5aeb', { description: 'Creamy unsalted butter for baking and cooking.' }],
    ['Mozzarella Fresh', 'mozzarella-fresh', 'dairy-eggs', 'daily-dairy', 6800, '200g ball', 40, 'photo-1626957341926-98752fc2ba90', { description: 'Fresh mozzarella in water. Perfect for caprese.' }],

    // Bakery
    ['Sourdough Loaf', 'sourdough-loaf', 'bakery', 'local-harvest', 5500, '600g loaf', 25, 'photo-1509440159596-0249088772ff', { isFeatured: true, isVegan: true, description: 'Hand-crafted sourdough, slow-fermented for 24 hours.' }],
    ['Croissants', 'croissants', 'bakery', 'local-harvest', 4200, 'pack of 4', 30, 'photo-1555507036-ab1f4038808a', { description: 'Buttery, flaky croissants baked fresh daily.' }],
    ['Bagels', 'bagels', 'bakery', 'local-harvest', 3800, 'pack of 6', 35, 'photo-1608166214049-38f8a4cf4f90', { isVegan: true, description: 'Chewy New York-style bagels.' }],
    ['Whole Wheat Bread', 'whole-wheat-bread', 'bakery', 'local-harvest', 2800, 'loaf', 50, 'photo-1509720974093-6e1e9a1a1b1e', { isVegan: true, description: 'Wholesome whole wheat sandwich bread.' }],

    // Meat & poultry
    ['Chicken Breast', 'chicken-breast', 'meat-poultry', 'premium-cuts', 12500, '500g', 30, 'photo-1604503468506-a8da13d82791', { isFeatured: true, description: 'Boneless, skinless chicken breast fillets.' }],
    ['Ground Beef', 'ground-beef', 'meat-poultry', 'premium-cuts', 15500, '500g', 25, 'photo-1589310243389-96a5483213a8', { description: 'Premium ground beef, 85% lean.' }],
    ['Beef Steak', 'beef-steak', 'meat-poultry', 'premium-cuts', 28500, '300g', 15, 'photo-1606851091851-e8c8c0fca5ba', { description: 'Tender ribeye steak, well-marbled.' }],
    ['Whole Chicken', 'whole-chicken', 'meat-poultry', 'premium-cuts', 9500, '1.2kg avg', 20, 'photo-1604503468506-a8da13d82791', { description: 'Free-range whole chicken, ready to roast.' }],

    // Seafood
    ['Atlantic Salmon', 'atlantic-salmon', 'seafood', 'local-harvest', 35000, '300g fillet', 12, 'photo-1519708227418-c8fd9a32b7a2', { isFeatured: true, description: 'Fresh Atlantic salmon fillet, rich in omega-3.' }],
    ['Shrimp Raw', 'shrimp-raw', 'seafood', 'local-harvest', 28000, '500g', 18, 'photo-1565680018434-b513d5e5fd47', { description: 'Peeled and deveined raw shrimp.' }],
    ['Sea Bass', 'sea-bass', 'seafood', 'local-harvest', 22000, 'whole (~600g)', 10, 'photo-1535140728325-a4d3707eee62', { description: 'Fresh whole sea bass, cleaned and scaled.' }],

    // Pantry
    ['Basmati Rice', 'basmati-rice', 'pantry', null, 8500, '2kg bag', 100, 'photo-1586201375761-83865001e31c', { isFeatured: true, isVegan: true, description: 'Premium long-grain basmati rice.' }],
    ['Spaghetti Pasta', 'spaghetti-pasta', 'pantry', null, 3500, '500g', 130, 'photo-1551462147-37885acc36f1', { isVegan: true, description: 'Classic durum wheat spaghetti.' }],
    ['Extra Virgin Olive Oil', 'olive-oil-evoo', 'pantry', null, 12500, '750ml bottle', 80, 'photo-1474979266404-7eaacbcd87c5', { isFeatured: true, isVegan: true, description: 'Cold-pressed extra virgin olive oil.' }],
    ['Sea Salt', 'sea-salt', 'pantry', null, 2500, '500g', 200, 'photo-1518110925495-b37653f4f4f4', { isVegan: true, description: 'Coarse Mediterranean sea salt.' }],
    ['Black Peppercorns', 'black-peppercorns', 'pantry', null, 4500, '200g jar', 90, 'photo-1599909533734-be0bf6f9e0db', { isVegan: true, description: 'Whole black peppercorns for your grinder.' }],
    ['Cane Sugar', 'cane-sugar', 'pantry', null, 3200, '1kg', 150, 'photo-1622621766574-bb6ce05f25b6', { isVegan: true, description: 'Refined white cane sugar.' }],

    // Snacks
    ['Dark Chocolate 70%', 'dark-chocolate-70', 'snacks', null, 5500, '100g bar', 70, 'photo-1623660053975-cf75a8be0908', { isVegan: true, isFeatured: true, description: 'Single-origin 70% dark chocolate.' }],
    ['Potato Chips Sea Salt', 'potato-chips-sea-salt', 'snacks', null, 2800, '150g bag', 120, 'photo-1566478989037-eec170784d0b', { isVegan: true, description: 'Kettle-cooked potato chips with sea salt.' }],
    ['Mixed Nuts Roasted', 'mixed-nuts-roasted', 'snacks', null, 9500, '400g jar', 60, 'photo-1599599810769-bcde5a160d32', { isVegan: true, description: 'Roasted almonds, cashews, and walnuts.' }],
    ['Granola Bars', 'granola-bars', 'snacks', null, 4800, 'box of 6', 80, 'photo-1605116091837-94d4d8d1f1f1', { isVegan: true, description: 'Chewy granola bars with oats and honey.' }],

    // Beverages
    ['Sparkling Water', 'sparkling-water', 'beverages', null, 1800, '1L bottle', 200, 'photo-1523362628745-0c100150b504', { isVegan: true, description: 'Naturally carbonated mineral water.' }],
    ['Orange Juice Fresh', 'orange-juice-fresh', 'beverages', null, 5500, '1L bottle', 90, 'photo-1600271886742-f049cd451bba', { isVegan: true, isFeatured: true, description: '100% fresh-squeezed orange juice.' }],
    ['Coffee Beans Espresso', 'coffee-beans-espresso', 'beverages', null, 12500, '500g bag', 75, 'photo-1559056199-641a0ac8b55e', { isVegan: true, description: 'Medium-dark roast espresso blend.' }],
    ['Green Tea Bags', 'green-tea-bags', 'beverages', null, 3500, 'box of 25', 110, 'photo-1597318181409-cf64d0f5368a', { isVegan: true, description: 'Organic green tea bags.' }],
    ['Cola 6-Pack', 'cola-6-pack', 'beverages', null, 5500, '6 × 330ml cans', 100, 'photo-1622483767028-3f66f382b39a', { isVegan: true, description: 'Classic cola, 6-pack of cans.' }],

    // Frozen
    ['Frozen Berries Mix', 'frozen-berries-mix', 'frozen', null, 6500, '500g bag', 50, 'photo-1682687220063-5e6b71dc8e64', { isVegan: true, description: 'Frozen strawberries, blueberries, and raspberries.' }],
    ['Vanilla Ice Cream', 'vanilla-ice-cream', 'frozen', null, 7800, '1L tub', 40, 'photo-1567206563064-6f60f40a2b57', { isFeatured: true, description: 'Premium Madagascar vanilla ice cream.' }],
    ['Frozen Pizza Margherita', 'frozen-pizza-margherita', 'frozen', null, 8500, 'single pizza', 35, 'photo-1564043443929-346d49b2fe5b', { isVegan: false, description: 'Stone-baked margherita pizza, ready to bake.' }],
    ['Frozen Peas', 'frozen-peas', 'frozen', null, 2800, '1kg bag', 100, 'photo-1599909533734-be0bf6f9e0db', { isVegan: true, description: 'Garden-fresh frozen peas.' }],

    // Household
    ['Paper Towels', 'paper-towels', 'household', null, 4500, 'pack of 6 rolls', 90, 'photo-1583947215259-38e31be8751f', { description: 'Strong, absorbent paper towels.' }],
    ['Dish Soap', 'dish-soap', 'household', null, 3500, '750ml bottle', 110, 'photo-1610557892470-55d9e80c0bce', { description: 'Grease-cutting dish soap, lemon scent.' }],
    ['Laundry Detergent', 'laundry-detergent', 'household', null, 12500, '3L bottle', 60, 'photo-1610557892470-55d9e80c0bce', { description: 'Concentrated laundry detergent, 60 washes.' }],
    ['Trash Bags', 'trash-bags', 'household', null, 5500, 'pack of 30', 80, 'photo-1583947215259-38e31be8751f', { description: 'Heavy-duty trash bags, 30L capacity.' }],
  ]

  for (const p of products) {
    const [name, slug, catSlug, brandSlug, price, unit, stock, imgPath, opts] = p
    await db.product.create({
      data: {
        name,
        slug,
        categoryId: cat(catSlug).id,
        brandId: brandSlug ? brand(brandSlug).id : null,
        pricePiasters: price,
        unit,
        stock,
        imageUrl: IMG(imgPath),
        sku: slug.toUpperCase().replace(/-/g, '-').slice(0, 20),
        description: opts?.description,
        longDescription: opts?.longDescription,
        isFeatured: opts?.isFeatured ?? false,
        isOrganic: opts?.isOrganic ?? false,
        isVegan: opts?.isVegan ?? false,
        compareAtPricePiasters: opts?.compareAtPricePiasters,
        isActive: true,
      },
    })
  }

  // 4. Users ----------------------------------------------------------
  const adminPassword = hashPassword('admin123')
  const customerPassword = hashPassword('customer123')

  const admin = await db.user.create({
    data: {
      email: 'admin@she2be.com',
      passwordHash: adminPassword,
      name: 'Store Admin',
      role: 'admin',
      phone: '+20 100 000 0001',
    },
  })

  const customer = await db.user.create({
    data: {
      email: 'customer@she2be.com',
      passwordHash: customerPassword,
      name: 'Demo Customer',
      role: 'customer',
      phone: '+20 100 000 0002',
    },
  })

  // 5. Coupons --------------------------------------------------------
  await db.coupon.create({
    data: {
      code: 'WELCOME10',
      description: '10% off your first order',
      discountType: 'percent',
      discountValue: 10,
      minOrderPiasters: 5000,
      isActive: true,
    },
  })

  await db.coupon.create({
    data: {
      code: 'SAVE25',
      description: '25 EGP off orders above 200 EGP',
      discountType: 'fixed',
      discountValue: 2500,
      minOrderPiasters: 20000,
      isActive: true,
    },
  })

  // 6. Audit log entry ------------------------------------------------
  await db.auditLog.create({
    data: {
      actorEmail: 'system@she2be.com',
      action: 'SEED',
      entity: 'system',
      entityId: 'seed',
      metadata: JSON.stringify({
        categories: categoryRecords.length,
        brands: brandRecords.length,
        products: products.length,
        users: 2,
        coupons: 2,
      }),
    },
  })

  console.log('✅ Seed complete:')
  console.log(`   ${categoryRecords.length} categories`)
  console.log(`   ${brandRecords.length} brands`)
  console.log(`   ${products.length} products`)
  console.log(`   2 users  (admin@she2be.com / admin123, customer@she2be.com / customer123)`)
  console.log(`   2 coupons (WELCOME10, SAVE25)`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
