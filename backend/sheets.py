import gspread
from google.oauth2.service_account import Credentials
from typing import List, Optional
import os
import json
from . import schemas

# Scope validation
SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive"
]

CREDENTIALS_FILE = "backend/service-account.json"
# User provided ID
SPREADSHEET_ID = os.getenv("SPREADSHEET_ID", "1trywo0xqOflaSLDUV0n8tuGqDguGmaMsfYmo31VuaVs")

def get_db_connection():
    # Priority 1: Environment Variable (for Render)
    google_creds_json = os.getenv("GOOGLE_CREDENTIALS_JSON")
    if google_creds_json:
        creds_dict = json.loads(google_creds_json)
        creds = Credentials.from_service_account_info(creds_dict, scopes=SCOPES)
        client = gspread.authorize(creds)
        return client

    # Priority 2: Local File
    if os.path.exists(CREDENTIALS_FILE):
        creds = Credentials.from_service_account_file(CREDENTIALS_FILE, scopes=SCOPES)
        client = gspread.authorize(creds)
        return client
        
    print("Warning: No Google Credentials found (File or Env Var)!")
    return None

def get_spreadsheet(client):
    # Open by ID
    try:
        if SPREADSHEET_ID:
            return client.open_by_key(SPREADSHEET_ID)
    except Exception as e:
        print(f"Error opening sheet by ID: {e}")

    # Fallback: Open by name or create
    try:
        return client.open("ProductManagerDB")
    except gspread.SpreadsheetNotFound:
        print("Spreadsheet not found, creating new one...")
        sh = client.create("ProductManagerDB")
        # Share with client email to ensure visibility if needed, though service account owns it
        # sh.share(client.auth.service_account_email, perm_type='user', role='owner')
        
        # Initialize worksheets
        sh.add_worksheet(title="ingredients", rows=1000, cols=10)
        sh.add_worksheet(title="recipes", rows=1000, cols=10)
        sh.add_worksheet(title="recipe_items", rows=1000, cols=10)
        return sh

# --- CRUD Operations ---

class SheetsCRUD:
    def __init__(self):
        self.client = get_db_connection()
        if self.client:
            self.sh = get_spreadsheet(self.client)
            self.recipe_ws = self._get_or_create_worksheet("recipes", ["id", "name", "description"])
            # Updated to include new columns
            self.ing_ws = self._get_or_create_worksheet("ingredients", ["id", "name", "price", "amount", "unit", "updated_at", "tax_type", "tax_rate"])
            self.recipe_item_ws = self._get_or_create_worksheet("recipe_items", ["id", "recipe_id", "ingredient_id", "amount", "section"])

    def _get_or_create_worksheet(self, title, headers):
        try:
            ws = self.sh.worksheet(title)
            # Check if headers match and update if necessary - simple check for length for now to act as "migration"
            current_headers = ws.row_values(1)
            if len(current_headers) < len(headers):
                 # Add missing headers if needed
                 # This is a bit risky but simple for this use case
                 ws.resize(cols=len(headers))
                 for i, h in enumerate(headers):
                     if i >= len(current_headers):
                         ws.update_cell(1, i+1, h)

        except:
            ws = self.sh.add_worksheet(title, 1000, 10)
            ws.append_row(headers)
        return ws

    def _get_next_id(self, worksheet):
        # Simple ID generation: count rows
        # Row 1 is header.
        return len(worksheet.get_all_values()) 

    # Ingredients
    # Ingredients
    def _clean_ingredient_record(self, r):
        """Handle empty strings for new columns to prevent parsing errors"""
        if r.get('tax_rate') == '':
            r['tax_rate'] = 0.08
        if r.get('tax_type') == '':
            r['tax_type'] = 'inclusive'
        if r.get('updated_at') == '':
            r['updated_at'] = None
        return r

    def get_ingredients(self):
        if not self.client: return []
        records = self.ing_ws.get_all_records()
        return [schemas.Ingredient(**self._clean_ingredient_record(r)) for r in records]

    def create_ingredient(self, ing: schemas.IngredientCreate):
        if not self.client: raise Exception("DB not connected")
        new_id = self._get_next_id(self.ing_ws)
        row = [new_id, ing.name, ing.price, ing.amount, ing.unit, ing.updated_at, ing.tax_type, ing.tax_rate]
        self.ing_ws.append_row(row)
        return schemas.Ingredient(id=new_id, **ing.dict())

    def update_ingredient(self, ingredient_id: int, ing: schemas.IngredientCreate):
        if not self.client: raise Exception("DB not connected")
        
        # Find row by ID (column 1)
        try:
            cell = self.ing_ws.find(str(ingredient_id), in_column=1)
        except gspread.exceptions.CellNotFound:
            return None
            
        row_num = cell.row
        # Update columns B to H (2 to 8)
        # name, price, amount, unit, updated_at, tax_type, tax_rate
        self.ing_ws.update(range_name=f'B{row_num}:H{row_num}', values=[[ing.name, ing.price, ing.amount, ing.unit, ing.updated_at, ing.tax_type, ing.tax_rate]])
        
        return schemas.Ingredient(id=ingredient_id, **ing.dict())

    # Recipes
    def get_recipes(self):
        if not self.client: return []
        # Get all data
        r_records = self.recipe_ws.get_all_records()
        i_records = self.ing_ws.get_all_records()
        ri_records = self.recipe_item_ws.get_all_records()
        
        # Build lookup dicts (Clean ingredient records first)
        ing_map = {r['id']: self._clean_ingredient_record(r) for r in i_records}
        
        results = []
        for r in r_records:
            recipe_id = r['id']
            # Find items for this recipe
            items = []
            total_cost = 0
            
            recipe_items = [ri for ri in ri_records if ri['recipe_id'] == recipe_id]
            
            for ri in recipe_items:
                ing_data = ing_map.get(ri['ingredient_id'])
                if ing_data:
                    # Calculate cost with tax logic
                    raw_price = float(ing_data['price'])
                    tax_type = ing_data.get('tax_type', 'inclusive')
                    # If tax_rate is missing or empty string, default to 0.08
                    tax_raw = ing_data.get('tax_rate')
                    tax_rate = float(tax_raw) if (tax_raw is not None and tax_raw != '') else 0.08

                    if tax_type == 'exclusive':
                        price_with_tax = raw_price * (1 + tax_rate)
                    else:
                        price_with_tax = raw_price

                    unit_cost = price_with_tax / float(ing_data['amount'])
                    cost = unit_cost * float(ri['amount'])
                    total_cost += cost
                    
                    items.append(schemas.RecipeItem(
                        id=ri['id'],
                        ingredient_id=ri['ingredient_id'],
                        amount=ri['amount'],
                        section=ri.get('section', 'dough'),
                        ingredient=schemas.Ingredient(**ing_data),
                        cost=cost
                    ))
            
            # Construct Recipe object
            results.append(schemas.Recipe(
                id=recipe_id,
                name=r['name'],
                description=r.get('description'),
                items=items,
                total_cost=total_cost
            ))
        return results

    def create_recipe(self, recipe: schemas.RecipeCreate):
        if not self.client: raise Exception("DB not connected")
        
        # 1. Create Recipe
        new_r_id = self._get_next_id(self.recipe_ws)
        self.recipe_ws.append_row([new_r_id, recipe.name, recipe.description])
        
        # 2. Create Recipe Items
        created_items = []
        # Need to fetch ingredients for full response, but for now we skip that or fetch
        
        for item in recipe.items:
            new_ri_id = self._get_next_id(self.recipe_item_ws) + len(created_items) # offset
            self.recipe_item_ws.append_row([
                new_ri_id,
                new_r_id,
                item.ingredient_id,
                item.amount,
                item.section
            ])
            # For response, we'd need to reconstruct objects. 
            # Doing a full fetch is eager but easiest for compliance with schema.
            
        return self.get_recipe(new_r_id) # Re-fetch to return full object

    def get_recipe(self, recipe_id: int):
        recipes = self.get_recipes()
        for r in recipes:
            if r.id == recipe_id:
                return r
        return None

# Singleton instance
db = SheetsCRUD()
