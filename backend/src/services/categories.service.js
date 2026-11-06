// SCRUM-13 (Luis): the category list with how many active products each has (handbook 8.1, 8.2).
import db from '../db/knex.js';
import { toCategory } from '../utils/productQuery.js';

// GET /categories, in id order (the order of handbook Appendix A).
// LEFT JOIN so a category with no active products still appears, with productCount 0.
export async function listCategories() {
  const rows = await db('categories as c')
    .leftJoin('products as p', function joinActiveProducts() {
      this.on('p.category_id', '=', 'c.id').andOn('p.is_active', '=', db.raw('true'));
    })
    .select('c.id', 'c.name', 'c.slug', 'c.description')
    .count('p.id as product_count')
    .groupBy('c.id')
    .orderBy('c.id', 'asc');
  return rows.map(toCategory);
}
