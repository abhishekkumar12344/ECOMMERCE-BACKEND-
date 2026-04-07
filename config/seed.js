require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { Users, Products, Reviews } = require('./db');

async function seed() {
  console.log('🌱 Seeding database...');

  // Seed Admin
  const existingAdmin = await Users.findOne({ email: 'admin@premparth.com' });
  if (!existingAdmin) {
    const adminId = uuidv4();
    await Users.insert({ _id: adminId, name: 'Admin User', email: 'admin@premparth.com', password: bcrypt.hashSync('admin123', 10), phone: '9876543210', role: 'admin', createdAt: new Date() });
    console.log('✅ Admin: admin@premparth.com / admin123');
  }

  // Seed Test User
  const existingUser = await Users.findOne({ email: 'user@test.com' });
  let userId = existingUser?._id;
  if (!existingUser) {
    userId = uuidv4();
    await Users.insert({ _id: userId, name: 'Test User', email: 'user@test.com', password: bcrypt.hashSync('user123', 10), phone: '9123456789', address: '123 Main Street, Patna, Bihar 800001', role: 'user', createdAt: new Date() });
    console.log('✅ User: user@test.com / user123');
  }

  const products = [
    { name:'Mustard Oil', description:'Pure and cold-pressed mustard oil ideal for cooking and health benefits. Rich in omega-3 fatty acids and vitamin E.', price:180, unit:'Litre', category:'oil', image:'https://imgs.search.brave.com/YylAEeP4Y3PBiIGoNymBTzakqPuidt4JdGSLQQnYR0Q/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9pbWcu/ZnJlZXBpay5jb20v/cHJlbWl1bS1waG90/by9tdXN0YXJkLW9p/bC13aXRoLWZsb3dl/ci13aGl0ZS1iYWNr/Z3JvdW5kXzUyNTU3/NC0zMjQ1LmpwZz9z/ZW10PWFpc19oeWJy/aWQmdz03NDA', stock:500, featured:true },
    { name:'Channa Sattu', description:'Rich in protein and fiber — the perfect energy drink for summer. Made from roasted Bengal gram.', price:120, unit:'Kg', category:'food', image:'https://static.india.com/wp-content/uploads/2022/03/sattu-ka-sharbat.png?impolicy=Medium_Resize&w=1200&h=800', stock:300, featured:true },
    { name:'Besan (Gram Flour)', description:'Finely ground gram flour perfect for snacks, sweets, and everyday cooking.', price:95, unit:'Kg', category:'food', image:'https://m.media-amazon.com/images/I/61NYwvT+YJL._UF1000,1000_QL80_.jpg', stock:400, featured:false },
    { name:'Pure Desi Ghee', description:"Traditional clarified butter made from pure cow's milk — rich, aromatic and full of nutrients.", price:750, unit:'Kg', category:'ghee', image:'https://imgs.search.brave.com/mKQdwruaY_1qQ5By-TbggTqFrL7WJLo4anRWh9AxoW8/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly90My5m/dGNkbi5uZXQvanBn/LzAzLzAyLzE5LzY2/LzM2MF9GXzMwMjE5/NjY3MF95Vmk5cG5H/NU45MTVCOE82cTVY/MFBtWWp3Q0ZNOVZ0/eC5qcGc', stock:200, featured:true },
    { name:'High-Grade Diesel', description:'BS6 compliant diesel for superior engine performance and reduced emissions.', price:89, unit:'Litre', category:'fuel', image:'https://imgs.search.brave.com/hy9OC3iBjPPRwoePEeUgkQUBd693-fsAj93VknKB_mQ/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly90My5m/dGNkbi5uZXQvanBn/LzAwLzg5LzI0LzQ0/LzM2MF9GXzg5MjQ0/NDMzX3pGM0xKdHI2/cjBGdE9RWHVGSnVP/cTRUZ2JGbEVXb1RN/LmpwZw', stock:1000, featured:false },
    { name:'Premium Petrol', description:'High-octane petrol for superior performance and engine protection.', price:105, unit:'Litre', category:'fuel', image:'https://imgs.search.brave.com/sVMG-SM5ffnsvzYGyXcnesO7davQWlI1zZsnBdnWHGE/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9tZWRp/YS5pc3RvY2twaG90/by5jb20vaWQvMTM4/MzgxMzkyMi9waG90/by9mdWVsLWZpbGxp/bmctdXAtZnJvbS1h/LWdhc29saW5lLXB1/bXAtM2QtcmVuZGVy/aW5nLmpwZz9zPTYx/Mng2MTImdz0wJms9/MjAmYz1RUmdYUWow/RWpfVnVDSFpJQ0Vl/RDFrd2d4MEVjOURr/cS04RlB5b2czV3E0/PQ', stock:1000, featured:false },
    { name:'Refined Sunflower Oil', description:'Light and healthy sunflower oil, ideal for daily cooking with a high smoke point.', price:140, unit:'Litre', category:'oil', image:'https://m.media-amazon.com/images/I/61FWPR3LJQL._UF1000,1000_QL80_.jpg', stock:600, featured:true },
    { name:'Groundnut Oil', description:'Cold-pressed groundnut oil with a natural nutty flavour. Excellent for deep frying.', price:210, unit:'Litre', category:'oil', image:'https://m.media-amazon.com/images/I/71mEPjC2u2L._UF1000,1000_QL80_.jpg', stock:350, featured:false },
  ];

  for (const p of products) {
    const existing = await Products.findOne({ name: p.name });
    if (!existing) {
      await Products.insert({ _id: uuidv4(), ...p, active: true, createdAt: new Date() });
    }
  }
  console.log('✅ Products seeded');

  const allProducts = await Products.find({});
  const reviewTexts = [
    'Excellent quality! Absolutely pure and fresh.', 'Fast delivery, great packaging. Will order again.',
    'The ghee is amazing, just like homemade!', 'Good product, very reasonable price.',
  ];
  for (let i = 0; i < allProducts.length; i++) {
    const existing = await Reviews.findOne({ productId: allProducts[i]._id, userName: 'Admin Review' });
    if (!existing) {
      await Reviews.insert({ _id: uuidv4(), productId: allProducts[i]._id, userId: userId || 'seed', userName: 'Verified Customer', rating: 4 + (i % 2), comment: reviewTexts[i % 4], createdAt: new Date() });
    }
  }

  console.log('🎉 Database seeded!\n');
  console.log('📋 Credentials:\n   Admin: admin@premparth.com / admin123\n   User:  user@test.com / user123');
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
