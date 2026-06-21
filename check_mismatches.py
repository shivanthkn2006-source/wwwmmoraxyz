import re
import os

def get_src_tables():
    tables = set()
    pattern = re.compile(r"supabase\.from\(['\"]([^'\"]+)['\"]\)")
    for root, _, files in os.walk('src'):
        for file in files:
            if file.endswith(('.ts', '.tsx', '.js', '.jsx')):
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        matches = pattern.findall(content)
                        for m in matches:
                            tables.add(m)
                except:
                    pass
    return tables

def get_type_tables():
    tables = set()
    with open('src/integrations/supabase/types.ts', 'r', encoding='utf-8') as f:
        content = f.read()
        
        # Look for the Tables block inside public
        # Using a more robust approach: find all keys that have Row, Insert, Update
        # This is characteristic of Supabase generated types
        matches = re.findall(r'(\w+): \{\s+Row: \{', content)
        for m in matches:
            tables.add(m)
            
        # Also check for Views
        # (Views also have Row, but maybe not Insert/Update)
        # But for now Row is enough to identify a table/view
    return tables

src_tables = get_src_tables()
type_tables = get_type_tables()

mismatches = src_tables - type_tables
print(f"Total src tables: {len(src_tables)}")
print(f"Total type tables: {len(type_tables)}")
print("Tables in src but missing in types.ts:")
for m in sorted(mismatches):
    print(m)

