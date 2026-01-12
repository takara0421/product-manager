from typing import List
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from . import schemas
# from .database import engine, Base, get_db
from . import sheets

# Base.metadata.create_all(bind=engine)

app = FastAPI(title="Product Manager API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to Product Management Queen API (Google Sheets Edition)"}

# Ingredient Endpoints
@app.post("/ingredients/", response_model=schemas.Ingredient)
def create_ingredient(ingredient: schemas.IngredientCreate):
    return sheets.db.create_ingredient(ingredient)

@app.get("/ingredients/", response_model=List[schemas.Ingredient])
def read_ingredients():
    return sheets.db.get_ingredients()

@app.put("/ingredients/{ingredient_id}", response_model=schemas.Ingredient)
def update_ingredient(ingredient_id: int, ingredient: schemas.IngredientCreate):
    updated_ingredient = sheets.db.update_ingredient(ingredient_id, ingredient)
    if updated_ingredient is None:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    return updated_ingredient

# Recipe Endpoints
@app.post("/recipes/", response_model=schemas.Recipe)
def create_recipe(recipe: schemas.RecipeCreate):
    return sheets.db.create_recipe(recipe)

@app.get("/recipes/", response_model=List[schemas.Recipe])
def read_recipes():
    return sheets.db.get_recipes()

@app.get("/recipes/{recipe_id}", response_model=schemas.Recipe)
def read_recipe(recipe_id: int):
    recipe = sheets.db.get_recipe(recipe_id)
    if recipe is None:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return recipe
