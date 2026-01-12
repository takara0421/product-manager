from typing import List, Optional
from pydantic import BaseModel

# Ingredient Schemas
class IngredientBase(BaseModel):
    name: str
    price: float
    amount: float
    unit: str
    updated_at: Optional[str] = None
    tax_type: Optional[str] = "inclusive" # 'inclusive' or 'exclusive'
    tax_rate: Optional[float] = 0.08

class IngredientCreate(IngredientBase):
    pass

class Ingredient(IngredientBase):
    id: int
    
    class Config:
        orm_mode = True

# Recipe Item Schemas
class RecipeItemBase(BaseModel):
    ingredient_id: int
    amount: float
    section: str = "dough" # 'dough' or 'filling'

class RecipeItemCreate(RecipeItemBase):
    pass

class RecipeItem(RecipeItemBase):
    id: int
    ingredient: Ingredient # Include full ingredient details for display
    cost: float # Calculated field for display

    class Config:
        orm_mode = True

# Recipe Schemas
class RecipeBase(BaseModel):
    name: str
    description: Optional[str] = None
    selling_price: Optional[float] = 0.0
    updated_at: Optional[str] = None

class RecipeCreate(RecipeBase):
    items: List[RecipeItemCreate] = []

class Recipe(RecipeBase):
    id: int
    items: List[RecipeItem] = []
    total_cost: float # Calculated field

    class Config:
        orm_mode = True
