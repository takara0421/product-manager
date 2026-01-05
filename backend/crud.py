from sqlalchemy.orm import Session
from . import models, schemas

# Ingredients
def get_ingredient(db: Session, ingredient_id: int):
    return db.query(models.Ingredient).filter(models.Ingredient.id == ingredient_id).first()

def get_ingredients(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Ingredient).offset(skip).limit(limit).all()

def create_ingredient(db: Session, ingredient: schemas.IngredientCreate):
    db_ingredient = models.Ingredient(**ingredient.dict())
    db.add(db_ingredient)
    db.commit()
    db.refresh(db_ingredient)
    return db_ingredient

# Recipes
def get_recipe(db: Session, recipe_id: int):
    recipe = db.query(models.Recipe).filter(models.Recipe.id == recipe_id).first()
    if recipe:
        # Calculate cost dynamically
        total_cost = 0
        for item in recipe.items:
            # item.ingredient might be lazy loaded, but accessing it should load it
            if item.ingredient and item.ingredient.amount > 0:
                cost_per_unit = item.ingredient.price / item.ingredient.amount
                item_cost = cost_per_unit * item.amount
                total_cost += item_cost
                
                # We can also attach the cost to the item object for display if we modify the schema/object at runtime
                # or rely on the front end to calculate it.
                # However, the Pydantic model for RecipeItem has a 'cost' field we should populate.
                item.cost = item_cost  # Monkey-patching onto the ORM object for Pydantic serialization
        
        recipe.total_cost = total_cost # Monkey-patching
    return recipe

def get_recipes(db: Session, skip: int = 0, limit: int = 100):
    recipes = db.query(models.Recipe).offset(skip).limit(limit).all()
    for recipe in recipes:
        total_cost = 0
        for item in recipe.items:
            if item.ingredient and item.ingredient.amount > 0:
                cost_per_unit = item.ingredient.price / item.ingredient.amount
                total_cost += cost_per_unit * item.amount
        recipe.total_cost = total_cost
    return recipes

def create_recipe(db: Session, recipe: schemas.RecipeCreate):
    db_recipe = models.Recipe(name=recipe.name, description=recipe.description)
    db.add(db_recipe)
    db.commit()
    db.refresh(db_recipe)
    
    for item in recipe.items:
        db_item = models.RecipeItem(
            recipe_id=db_recipe.id,
            ingredient_id=item.ingredient_id,
            amount=item.amount,
            category=item.category
        )
        db.add(db_item)
    
    db.commit()
    db.refresh(db_recipe)
    return db_recipe
