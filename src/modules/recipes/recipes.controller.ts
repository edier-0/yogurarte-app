import { Request, Response, NextFunction } from 'express';
import * as recipesService from './recipes.service.js';
import {
  sanitizeRecipeForRole,
  sanitizeRecipeListForRole,
  sanitizeSimulationForRole,
} from './recipes.serializer.js';

export async function getRecipes(req: Request, res: Response, next: NextFunction) {
  try {
    const list = await recipesService.listRecipes(req.query as any);
    const sanitized = sanitizeRecipeListForRole(list, req.user?.role);
    res.json(sanitized);
  } catch (err) {
    next(err);
  }
}

export async function getRecipeById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const recipe = await recipesService.getRecipeById(id);
    const sanitized = sanitizeRecipeForRole(recipe, req.user?.role);
    res.json(sanitized);
  } catch (err) {
    next(err);
  }
}

export async function createRecipe(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id || 1;
    const recipe = await recipesService.createRecipe(req.body, userId);
    const sanitized = sanitizeRecipeForRole(recipe, req.user?.role);
    res.status(201).json(sanitized);
  } catch (err) {
    next(err);
  }
}

export async function updateRecipe(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const recipe = await recipesService.updateRecipe(id, req.body);
    const sanitized = sanitizeRecipeForRole(recipe, req.user?.role);
    res.json(sanitized);
  } catch (err) {
    next(err);
  }
}

export async function toggleArchiveRecipe(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const recipe = await recipesService.toggleArchiveRecipe(id);
    const sanitized = sanitizeRecipeForRole(recipe, req.user?.role);
    res.json(sanitized);
  } catch (err) {
    next(err);
  }
}

export async function deleteRecipe(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const result = await recipesService.deleteRecipe(id);
    res.json({ message: 'Receta eliminada correctamente', result });
  } catch (err) {
    next(err);
  }
}

export async function simulatePresentation(req: Request, res: Response, next: NextFunction) {
  try {
    const recipeId = Number(req.params.id);
    const presentationId = Number(req.params.presentationId);
    const result = await recipesService.simulateRecipePresentation(recipeId, presentationId);
    const sanitized = sanitizeSimulationForRole(result, req.user?.role);
    res.json(sanitized);
  } catch (err) {
    next(err);
  }
}
