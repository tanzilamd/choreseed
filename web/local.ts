import { openDB } from 'idb';
import { validateRecipe, type Recipe } from '../src/shared/recipe.js';
const db = () => openDB('choreseed', 1, { upgrade(database) { database.createObjectStore('recipes', { keyPath: 'id' }); } });
export type Saved = { id: string; savedAt: string; recipe: Recipe };
export async function listRecipes(): Promise<Saved[]> { return (await (await db()).getAll('recipes')).sort((a, b) => b.savedAt.localeCompare(a.savedAt)); }
export async function saveRecipe(recipe: Recipe): Promise<void> { await (await db()).put('recipes', { id: crypto.randomUUID(), savedAt: new Date().toISOString(), recipe: validateRecipe(recipe) }); }
export async function deleteRecipe(id: string) { await (await db()).delete('recipes', id); }
export function download(content: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type })); const anchor = document.createElement('a');
  anchor.href = url; anchor.download = name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
