import { Router } from 'express';
import * as categoryService from '../services/category.service.js';

export const categoriesRouter = Router();

categoriesRouter.get('/', (req, res) => {
  const categories = categoryService.listCategories();
  res.json(categories);
});

categoriesRouter.get('/:id', (req, res) => {
  const category = categoryService.getCategory(parseInt(req.params.id));
  if (!category) return res.status(404).json({ error: 'Categoria no encontrada' });
  res.json(category);
});

categoriesRouter.post('/', (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'name es requerido' });

  try {
    const category = categoryService.createCategory(name, description);
    res.status(201).json(category);
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Ya existe una categoria con ese nombre' });
    }
    throw err;
  }
});

categoriesRouter.put('/:id', (req, res) => {
  const { name, description } = req.body;
  const category = categoryService.updateCategory(parseInt(req.params.id), { name, description });
  if (!category) return res.status(404).json({ error: 'Categoria no encontrada' });
  res.json(category);
});

categoriesRouter.delete('/:id', (req, res) => {
  const deleted = categoryService.deleteCategory(parseInt(req.params.id));
  if (!deleted) return res.status(404).json({ error: 'Categoria no encontrada' });
  res.json({ success: true });
});

categoriesRouter.get('/:id/pilots', (req, res) => {
  const pilots = categoryService.listCategoryPilots(parseInt(req.params.id));
  res.json(pilots);
});

categoriesRouter.post('/:id/pilots', (req, res) => {
  const { car_number, driver_name, color } = req.body;
  if (!car_number) return res.status(400).json({ error: 'car_number es requerido' });

  try {
    const pilot = categoryService.addCategoryPilot(parseInt(req.params.id), car_number, driver_name, color);
    res.status(201).json(pilot);
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Ya existe un piloto con ese numero en esta categoria' });
    }
    throw err;
  }
});

categoriesRouter.post('/:id/pilots/bulk', (req, res) => {
  const { pilots } = req.body;
  if (!Array.isArray(pilots)) return res.status(400).json({ error: 'pilots debe ser un array' });

  const added = categoryService.addCategoryPilotsBulk(parseInt(req.params.id), pilots);
  res.json({ success: true, added });
});

categoriesRouter.delete('/:id/pilots', (req, res) => {
  const cleared = categoryService.clearCategoryPilots(parseInt(req.params.id));
  res.json({ success: true, removed: cleared });
});

categoriesRouter.delete('/:id/pilots/:carNumber', (req, res) => {
  const removed = categoryService.removeCategoryPilot(parseInt(req.params.id), req.params.carNumber);
  if (!removed) return res.status(404).json({ error: 'Piloto no encontrado' });
  res.json({ success: true });
});
