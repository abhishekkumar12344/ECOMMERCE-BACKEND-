const Datastore = require('nedb');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dbDir, { recursive: true });

const makeDB = (name) => new Datastore({ filename: path.join(dbDir, `${name}.db`), autoload: true });

const rawDBs = {
  users:      makeDB('users'),
  products:   makeDB('products'),
  orders:     makeDB('orders'),
  orderItems: makeDB('orderItems'),
  reviews:    makeDB('reviews'),
  messages:   makeDB('messages'),
};

const wrap = (db) => ({
  find:    (q={}, sort={}) => new Promise((res,rej) => { let c = db.find(q); if (Object.keys(sort).length) c = c.sort(sort); c.exec((e,d) => e ? rej(e) : res(d)); }),
  findOne: (q)       => new Promise((res,rej) => db.findOne(q, (e,d) => e ? rej(e) : res(d))),
  insert:  (doc)     => new Promise((res,rej) => db.insert(doc, (e,d) => e ? rej(e) : res(d))),
  update:  (q,u,o={})=> new Promise((res,rej) => db.update(q, u, o, (e,n) => e ? rej(e) : res(n))),
  remove:  (q,o={})  => new Promise((res,rej) => db.remove(q, o, (e,n) => e ? rej(e) : res(n))),
  count:   (q={})    => new Promise((res,rej) => db.count(q, (e,n) => e ? rej(e) : res(n))),
});

rawDBs.users.ensureIndex({ fieldName: 'email', unique: true }, () => {});

console.log('✅ NeDB database ready');

module.exports = {
  Users:      wrap(rawDBs.users),
  Products:   wrap(rawDBs.products),
  Orders:     wrap(rawDBs.orders),
  OrderItems: wrap(rawDBs.orderItems),
  Reviews:    wrap(rawDBs.reviews),
  Messages:   wrap(rawDBs.messages),
};
