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
            self.recipe_ws = self._get_or_create_worksheet("recipes", ["id", "name", "description", "selling_price", "updated_at"])
            # Updated to include new columns
            self.ing_ws = self._get_or_create_worksheet("ingredients", ["id", "name", "price", "amount", "unit", "updated_at", "tax_type", "tax_rate"])
            self.recipe_item_ws = self._get_or_create_worksheet("recipe_items", ["id", "recipe_id", "ingredient_id", "amount", "section"])
            # History Worksheets
            self.ing_history_ws = self._get_or_create_worksheet("ingredients_history", ["id", "ingredient_id", "name", "price", "amount", "unit", "updated_at", "tax_type", "tax_rate", "changed_at"])
            self.recipe_history_ws = self._get_or_create_worksheet("recipes_history", ["id", "recipe_id", "name", "description", "selling_price", "updated_at", "items_snapshot", "total_cost", "changed_at"])

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
        
        # 1. Save current state to history BEFORE update
        current_values = self.ing_ws.row_values(row_num)
        # current_values matches columns: id, name, price, amount, unit, updated_at, tax_type, tax_rate
        # We need to map this to history schema.
        # Quick dict creation from headers (known order)
        headers = ["id", "name", "price", "amount", "unit", "updated_at", "tax_type", "tax_rate"]
        current_data = dict(zip(headers, current_values))
        
        history_id = self._get_next_id(self.ing_history_ws)
        import datetime
        now = datetime.datetime.now().isoformat()
        
        history_row = [
            history_id,
            ingredient_id,
            current_data.get('name'),
            current_data.get('price'),
            current_data.get('amount'),
            current_data.get('unit'),
            current_data.get('updated_at'),
            current_data.get('tax_type'),
            current_data.get('tax_rate'),
            now # changed_at
        ]
        self.ing_history_ws.append_row(history_row)

        # 2. Update columns B to H (2 to 8)
        # name, price, amount, unit, updated_at, tax_type, tax_rate
        self.ing_ws.update(range_name=f'B{row_num}:H{row_num}', values=[[ing.name, ing.price, ing.amount, ing.unit, ing.updated_at, ing.tax_type, ing.tax_rate]])
        
        return schemas.Ingredient(id=ingredient_id, **ing.dict())

    def get_ingredient_history(self, ingredient_id: int):
        if not self.client: return []
        records = self.ing_history_ws.get_all_records()
        # Filter by ingredient_id
        history = [r for r in records if str(r['ingredient_id']) == str(ingredient_id)]
        # Sort by changed_at desc
        history.sort(key=lambda x: x['changed_at'], reverse=True)
        return [schemas.IngredientHistory(**r) for r in history]

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
                selling_price=float(r.get('selling_price', 0) or 0),
                updated_at=r.get('updated_at'),
                items=items,
                total_cost=total_cost
            ))
        return results

    def create_recipe(self, recipe: schemas.RecipeCreate):
        if not self.client: raise Exception("DB not connected")
        
        # 1. Create Recipe
        new_r_id = self._get_next_id(self.recipe_ws)
        self.recipe_ws.append_row([new_r_id, recipe.name, recipe.description, recipe.selling_price, recipe.updated_at])
        
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

    def update_recipe(self, recipe_id: int, recipe: schemas.RecipeCreate):
        if not self.client: raise Exception("DB not connected")
        
        # 1. Get current recipe state for history
        current_recipe = self.get_recipe(recipe_id)
        if not current_recipe:
            return None

        # 2. Save to history
        history_id = self._get_next_id(self.recipe_history_ws)
        import datetime
        now = datetime.datetime.now().isoformat()
        
        # Serialize items
        import json
        # Convert items to simple dict list for JSON storage
        items_list = [item.dict() for item in current_recipe.items]
        items_json = json.dumps(items_list, default=str)

        history_row = [
            history_id,
            recipe_id,
            current_recipe.name,
            current_recipe.description,
            current_recipe.selling_price,
            current_recipe.updated_at,
            items_json,
            current_recipe.total_cost,
            now
        ]
        self.recipe_history_ws.append_row(history_row)
        
        # 3. Update Recipe Row
        try:
            cell = self.recipe_ws.find(str(recipe_id), in_column=1)
        except gspread.exceptions.CellNotFound:
            return None
        
        row_num = cell.row
        # Update basic info: name, description, selling_price, updated_at
        self.recipe_ws.update(range_name=f'B{row_num}:E{row_num}', values=[[recipe.name, recipe.description, recipe.selling_price, recipe.updated_at]])
        
        # 4. Update Recipe Items
        # Strategy: Delete old items for this recipe and create new ones.
        # This is inefficient for sheets but simplest to implement without complex diffing.
        
        # Find all items with this recipe_id
        # We need to find rows where col 2 (recipe_id) == recipe_id
        # "Batch delete" or "Overwrite"
        # Since we don't have good batch delete in gspread without row indices, let's try:
        # Get all records, filter out this recipe's items, then clear sheet and write back? TOO RISKY/SLOW.
        # Better: Just append new items and ignore old/orphaned ones in `get_recipes`? 
        # No, `get_recipes` fetches ALL. We must clean up.
        
        # Alternative: Re-implement `get_recipes` to filter out deleted? No field for that.
        
        # Let's do: Find keys of items to delete.
        all_items = self.recipe_item_ws.get_all_records()
        rows_to_delete = []
        # get_all_records returns dict list, we need row numbers. 
        # `findall` might work but only for specific value.
        
        cell_list = self.recipe_item_ws.findall(str(recipe_id), in_column=2)
        # Delete from bottom to top to preserve indices
        rows_to_delete = sorted([c.row for c in cell_list], reverse=True)
        
        for r_idx in rows_to_delete:
            self.recipe_item_ws.delete_rows(r_idx)
            
        # Add new items
        for item in recipe.items:
            new_ri_id = self._get_next_id(self.recipe_item_ws)
            self.recipe_item_ws.append_row([
                new_ri_id,
                recipe_id,
                item.ingredient_id,
                item.amount,
                item.section
            ])
            
        return self.get_recipe(recipe_id)

    def get_recipe_history(self, recipe_id: int):
        if not self.client: return []
        records = self.recipe_history_ws.get_all_records()
        history = [r for r in records if str(r['recipe_id']) == str(recipe_id)]
        history.sort(key=lambda x: x['changed_at'], reverse=True)
        
        # Note: items_snapshot is a JSON string, schema expects it as such.
        # If we wanted to hydrate objects we could, but schema defines it as str for now.
        return [schemas.RecipeHistory(**r) for r in history]

# Singleton instance
db = SheetsCRUD()
