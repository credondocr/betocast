import { queryAll, queryOne, run } from '../db/helpers.js';

export interface Category {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface CategoryPilot {
  id: number;
  category_id: number;
  car_number: string;
  driver_name: string | null;
  color: string;
}

export function createCategory(name: string, description?: string): Category {
  run(
    'INSERT INTO categories (name, description) VALUES (?, ?)',
    [name, description || null]
  );

  return queryOne<Category>('SELECT * FROM categories WHERE id = last_insert_rowid()')!;
}

export function getCategory(id: number): Category | undefined {
  return queryOne<Category>('SELECT * FROM categories WHERE id = ?', [id]);
}

export function listCategories(): Category[] {
  return queryAll<Category>('SELECT * FROM categories ORDER BY name');
}

export function updateCategory(id: number, updates: Partial<Pick<Category, 'name' | 'description'>>): Category | undefined {
  const fields: string[] = [];
  const values: any[] = [];

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (fields.length === 0) return getCategory(id);

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  run(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`, values);
  return getCategory(id);
}

export function deleteCategory(id: number): boolean {
  const result = run('DELETE FROM categories WHERE id = ?', [id]);
  return result.changes > 0;
}

export function addCategoryPilot(categoryId: number, carNumber: string, driverName?: string, color?: string): CategoryPilot {
  run(
    'INSERT INTO category_pilots (category_id, car_number, driver_name, color) VALUES (?, ?, ?, ?)',
    [categoryId, carNumber, driverName || null, color || '#3b82f6']
  );

  return queryOne<CategoryPilot>(
    'SELECT * FROM category_pilots WHERE category_id = ? AND car_number = ?',
    [categoryId, carNumber]
  )!;
}

export function removeCategoryPilot(categoryId: number, carNumber: string): boolean {
  const result = run('DELETE FROM category_pilots WHERE category_id = ? AND car_number = ?', [categoryId, carNumber]);
  return result.changes > 0;
}

export function listCategoryPilots(categoryId: number): CategoryPilot[] {
  return queryAll<CategoryPilot>(
    'SELECT * FROM category_pilots WHERE category_id = ? ORDER BY car_number',
    [categoryId]
  );
}

export function addCategoryPilotsBulk(categoryId: number, pilots: Array<{ car_number: string; driver_name?: string; color?: string }>): number {
  let added = 0;
  for (const pilot of pilots) {
    try {
      run(
        'INSERT INTO category_pilots (category_id, car_number, driver_name, color) VALUES (?, ?, ?, ?)',
        [categoryId, pilot.car_number, pilot.driver_name || null, pilot.color || '#3b82f6']
      );
      added++;
    } catch (err) {
      // Skip duplicates
    }
  }
  return added;
}

export function clearCategoryPilots(categoryId: number): number {
  const result = run('DELETE FROM category_pilots WHERE category_id = ?', [categoryId]);
  return result.changes;
}
