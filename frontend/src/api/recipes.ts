import { http } from './client';

export interface RecipeIngredientItem {
  id?: number;
  recipeId?: number;
  rawMaterialId: number;
  quantity: number;
  unit: string;
  notes?: string | null;
  avgCost?: number;
  unitCost?: number;
  totalCost?: number;
  rawMaterial?: {
    id: number;
    name: string;
    code: string;
    category: string;
    unit: string;
    avgCost?: number;
    currentStock?: number;
    isActive?: boolean;
  };
}

export interface RecipeStepItem {
  id?: number;
  recipeId?: number;
  stepNumber: number;
  title: string;
  description: string;
  estimatedMinutes?: number | null;
  temperatureMin?: number | null;
  temperatureMax?: number | null;
  temperatureTarget?: number | null;
  qualityCheck?: string | null;
}

export interface RecipeItem {
  id: number;
  code: string;
  name: string;
  category: 'ELABORACION' | 'FASE_A' | 'FASE_B';
  flavor?: string | null;
  outputMaterialId?: number | null;
  outputMaterial?: {
    id: number;
    name: string;
    code: string;
    unit: string;
  } | null;
  description?: string | null;
  baseYield: number;
  yieldUnit: string;
  baseLiters?: number | null;
  status: 'ACTIVA' | 'ARCHIVADA';
  createdById: number;
  createdAt: string;
  updatedAt: string;
  ingredients: RecipeIngredientItem[];
  steps: RecipeStepItem[];
  // Campos monetarios opcionales (solo para ADMIN/SOCIO)
  baseLitersCost?: number;
  ingredientsCost?: number;
  totalCost?: number;
  theoreticalUnitCost?: number;
  baseCostWarning?: string;
  createdBy?: {
    id: number;
    name: string;
    username: string;
    role: string;
  };
}

export interface CreateRecipePayload {
  code: string;
  name: string;
  category: 'ELABORACION' | 'FASE_A' | 'FASE_B';
  flavor?: string | null;
  outputMaterialId?: number | null;
  description?: string | null;
  baseYield: number;
  yieldUnit: string;
  baseLiters?: number | null;
  status?: 'ACTIVA' | 'ARCHIVADA';
  ingredients: Array<{
    rawMaterialId: number;
    quantity: number;
    unit: string;
    notes?: string | null;
  }>;
  steps: Array<{
    stepNumber: number;
    title: string;
    description: string;
    estimatedMinutes?: number | null;
    temperatureMin?: number | null;
    temperatureMax?: number | null;
    temperatureTarget?: number | null;
    qualityCheck?: string | null;
  }>;
}

export interface UpdateRecipePayload extends Partial<CreateRecipePayload> {}

export interface RecipeQueryFilters {
  category?: 'ELABORACION' | 'FASE_A' | 'FASE_B';
  status?: 'ACTIVA' | 'ARCHIVADA';
  flavor?: string;
  search?: string;
}

export interface SimulationResponse {
  recipeId: number;
  recipeName: string;
  flavor?: string | null;
  presentation: {
    id: number;
    name: string;
    label: string;
    capacityLiters: number;
  };
  liquidCost?: number;
  packagingItems: Array<{
    code: string;
    name: string;
    cost?: number;
    type: 'BOTELLA' | 'ETIQUETA';
    warning?: string;
  }>;
  packagingCost?: number;
  totalUnitCost?: number;
  defaultPrice?: number;
  projectedProfit?: number;
  marginPercentage?: number;
  marginStatus?: 'GREEN' | 'YELLOW' | 'RED';
}

export const recipesApi = {
  getRecipes(filters?: RecipeQueryFilters) {
    return http.get<RecipeItem[]>('/recipes', { params: filters });
  },

  getRecipeById(id: number) {
    return http.get<RecipeItem>(`/recipes/${id}`);
  },

  createRecipe(data: CreateRecipePayload) {
    return http.post<RecipeItem>('/recipes', data);
  },

  updateRecipe(id: number, data: UpdateRecipePayload) {
    return http.put<RecipeItem>(`/recipes/${id}`, data);
  },

  toggleArchiveRecipe(id: number) {
    return http.patch<RecipeItem>(`/recipes/${id}/archive`);
  },

  deleteRecipe(id: number) {
    return http.delete<{ message: string }>(`/recipes/${id}`);
  },

  simulatePresentation(recipeId: number, presentationId: number) {
    return http.get<SimulationResponse>(`/recipes/${recipeId}/simulate/${presentationId}`);
  },
};
