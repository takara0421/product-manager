from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base

class Ingredient(Base):
    __tablename__ = "ingredients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    # Price per package/unit
    price = Column(Float)
    # Content amount in package (e.g. 1000g)
    amount = Column(Float)
    # Unit of measure (g, ml, pc)
    unit = Column(String)
    
    # Calculated price per single unit (e.g. per 1g)
    # This might be calculated on the fly, but storing it is easier for queries?
    # Let's simple store raw data and calculate in app logic.

    recipe_items = relationship("RecipeItem", back_populates="ingredient")

class Recipe(Base):
    __tablename__ = "recipes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String, nullable=True)
    
    items = relationship("RecipeItem", back_populates="recipe", cascade="all, delete-orphan")

class RecipeItem(Base):
    __tablename__ = "recipe_items"

    id = Column(Integer, primary_key=True, index=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id"))
    ingredient_id = Column(Integer, ForeignKey("ingredients.id"))
    
    # Amount used in this recipe
    amount = Column(Float)
    
    # 'dough' (生地) or 'filling' (フィリング)
    section = Column(String, default='dough')
    
    recipe = relationship("Recipe", back_populates="items")
    ingredient = relationship("Ingredient", back_populates="recipe_items")
