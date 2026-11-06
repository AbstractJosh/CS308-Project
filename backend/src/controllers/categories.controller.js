// SCRUM-13 (Luis): sends { categories }.
import * as categoriesService from '../services/categories.service.js';

export async function list(req, res, next) {
  try {
    const categories = await categoriesService.listCategories();
    res.json({ categories });
  } catch (err) {
    next(err);
  }
}
