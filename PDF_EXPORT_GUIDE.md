# PDF Export Guide

This guide explains how to export the complete app documentation as PDF files for offline reference and team sharing.

---

## Documentation Files Available

The following comprehensive markdown documentation files are available in your project:

1. **APP_DOCUMENTATION.md** - Complete app features and UI/UX guide
2. **LISA_USER_GUIDE.md** - Full Lisa AI companion and voice command guide
3. **DESIGN_DIAGRAMS.md** - Visual architecture and design diagrams
4. **FEATURE_NAVIGATION_GUIDE.md** - Feature locations and navigation paths
5. **TESTING_GUIDE.md** - Testing procedures for all features
6. **LISA_COMMANDS.md** - Lisa voice commands reference
7. **LISA_LEARNING_SYSTEM.md** - Lisa's adaptive learning documentation

---

## Method 1: Using Visual Studio Code (Recommended)

### Prerequisites
- Visual Studio Code installed
- Markdown PDF extension

### Steps

1. **Install Markdown PDF Extension**
   ```
   - Open VS Code
   - Go to Extensions (Ctrl+Shift+X or Cmd+Shift+X)
   - Search for "Markdown PDF" by yzane
   - Click Install
   ```

2. **Export Single File**
   ```
   - Open any .md file (e.g., APP_DOCUMENTATION.md)
   - Right-click in the editor
   - Select "Markdown PDF: Export (pdf)"
   - Choose save location
   ```

3. **Export All Files**
   ```bash
   # Create a script to export all
   # Open each .md file and export individually
   # OR use the batch export method below
   ```

4. **Customize PDF Settings** (Optional)
   ```json
   // In VS Code settings.json
   {
     "markdown-pdf.format": "A4",
     "markdown-pdf.displayHeaderFooter": true,
     "markdown-pdf.headerTemplate": "<div style='font-size: 9px; margin-left: 1cm;'><span class='title'></span></div>",
     "markdown-pdf.footerTemplate": "<div style='font-size: 9px; margin: 0 auto;'><span class='pageNumber'></span> / <span class='totalPages'></span></div>",
     "markdown-pdf.margin.top": "1cm",
     "markdown-pdf.margin.bottom": "1cm",
     "markdown-pdf.margin.right": "1cm",
     "markdown-pdf.margin.left": "1cm"
   }
   ```

---

## Method 2: Using Online Markdown to PDF Converters

### Option A: Markdown to PDF (markdowntopdf.com)

1. Visit https://www.markdowntopdf.com/
2. Copy content from .md file
3. Paste into the converter
4. Click "Convert to PDF"
5. Download the generated PDF
6. Repeat for each documentation file

### Option B: Dillinger (dillinger.io)

1. Visit https://dillinger.io/
2. Click "Import From" → "Clipboard"
3. Paste markdown content
4. Click "Export As" → "PDF"
5. Download and save
6. Repeat for remaining files

### Option C: Markdown to PDF Converter (md2pdf.netlify.app)

1. Visit https://md2pdf.netlify.app/
2. Upload or paste markdown content
3. Customize styling (optional)
4. Click "Convert to PDF"
5. Download the result

---

## Method 3: Using Command Line Tools (Advanced)

### Using Pandoc

**Installation:**
```bash
# macOS
brew install pandoc

# Ubuntu/Debian
sudo apt-get install pandoc

# Windows (with Chocolatey)
choco install pandoc
```

**Export Single File:**
```bash
pandoc APP_DOCUMENTATION.md -o APP_DOCUMENTATION.pdf
```

**Export All Documentation Files:**
```bash
# Create a script (export-docs.sh)
#!/bin/bash

FILES=(
  "APP_DOCUMENTATION.md"
  "LISA_USER_GUIDE.md"
  "DESIGN_DIAGRAMS.md"
  "FEATURE_NAVIGATION_GUIDE.md"
  "TESTING_GUIDE.md"
  "LISA_COMMANDS.md"
  "LISA_LEARNING_SYSTEM.md"
)

for file in "${FILES[@]}"
do
  echo "Converting $file..."
  pandoc "$file" -o "${file%.md}.pdf" --pdf-engine=xelatex
done

echo "All files converted!"
```

**Run the script:**
```bash
chmod +x export-docs.sh
./export-docs.sh
```

**With Custom Styling:**
```bash
pandoc APP_DOCUMENTATION.md -o APP_DOCUMENTATION.pdf \
  --pdf-engine=xelatex \
  -V geometry:margin=1in \
  -V fontsize=11pt \
  --toc \
  --toc-depth=3
```

---

## Method 4: Using Node.js (Automated)

### Using md-to-pdf Package

**Installation:**
```bash
npm install -g md-to-pdf
```

**Export Files:**
```bash
# Single file
md-to-pdf APP_DOCUMENTATION.md

# Multiple files
md-to-pdf *.md

# With custom CSS
md-to-pdf APP_DOCUMENTATION.md --stylesheet custom.css
```

**Batch Script (export-all.js):**
```javascript
const fs = require('fs');
const { mdToPdf } = require('md-to-pdf');

const files = [
  'APP_DOCUMENTATION.md',
  'LISA_USER_GUIDE.md',
  'DESIGN_DIAGRAMS.md',
  'FEATURE_NAVIGATION_GUIDE.md',
  'TESTING_GUIDE.md',
  'LISA_COMMANDS.md',
  'LISA_LEARNING_SYSTEM.md'
];

(async () => {
  for (const file of files) {
    try {
      console.log(`Converting ${file}...`);
      await mdToPdf({ path: file }, {
        dest: file.replace('.md', '.pdf'),
        pdf_options: {
          format: 'A4',
          margin: '20mm',
          printBackground: true
        }
      });
      console.log(`✓ ${file} converted successfully`);
    } catch (error) {
      console.error(`✗ Error converting ${file}:`, error);
    }
  }
  console.log('All conversions complete!');
})();
```

**Run:**
```bash
node export-all.js
```

---

## Method 5: Using GitHub Actions (Automated CI/CD)

Create `.github/workflows/export-docs.yml`:

```yaml
name: Export Documentation to PDF

on:
  push:
    paths:
      - '**.md'
  workflow_dispatch:

jobs:
  export-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install Pandoc
        run: |
          sudo apt-get update
          sudo apt-get install -y pandoc texlive-xetex
      
      - name: Export Documentation
        run: |
          mkdir -p pdf-exports
          for file in *.md; do
            pandoc "$file" -o "pdf-exports/${file%.md}.pdf" --pdf-engine=xelatex
          done
      
      - name: Upload PDFs
        uses: actions/upload-artifact@v3
        with:
          name: documentation-pdfs
          path: pdf-exports/*.pdf
```

---

## Recommended Workflow for Team Sharing

### Step 1: Generate PDFs
Choose one of the methods above (Method 1 recommended for simplicity)

### Step 2: Organize PDFs
```bash
mkdir documentation-pdfs
mv *.pdf documentation-pdfs/
```

### Step 3: Create Master Documentation Package

**Option A: Merge PDFs** (if you have pdftk or similar)
```bash
pdftk \
  APP_DOCUMENTATION.pdf \
  LISA_USER_GUIDE.pdf \
  DESIGN_DIAGRAMS.pdf \
  FEATURE_NAVIGATION_GUIDE.pdf \
  TESTING_GUIDE.pdf \
  cat output COMPLETE_APP_DOCUMENTATION.pdf
```

**Option B: ZIP Archive**
```bash
zip -r app-documentation.zip documentation-pdfs/
```

### Step 4: Distribute

- **Internal Team:** Upload to company Google Drive/SharePoint/Confluence
- **Clients:** Share via secure link or email
- **Version Control:** Commit PDFs to a `docs/pdf` folder in repository
- **Documentation Site:** Host PDFs on GitHub Pages or similar

---

## Styling Tips for Better PDFs

### Add Custom CSS (for md-to-pdf)

Create `custom.css`:
```css
body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: 11pt;
  line-height: 1.6;
  color: #333;
}

h1 {
  color: #2c3e50;
  border-bottom: 2px solid #3498db;
  padding-bottom: 10px;
}

h2 {
  color: #34495e;
  margin-top: 30px;
}

code {
  background-color: #f4f4f4;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
}

pre {
  background-color: #f8f8f8;
  padding: 15px;
  border-left: 4px solid #3498db;
  overflow-x: auto;
}

blockquote {
  border-left: 4px solid #95a5a6;
  padding-left: 15px;
  color: #555;
  font-style: italic;
}

table {
  border-collapse: collapse;
  width: 100%;
  margin: 20px 0;
}

th, td {
  border: 1px solid #ddd;
  padding: 12px;
  text-align: left;
}

th {
  background-color: #3498db;
  color: white;
}
```

---

## Troubleshooting

### Mermaid Diagrams Not Rendering

**Solution 1:** Use mermaid-cli before converting
```bash
npm install -g @mermaid-js/mermaid-cli
mmdc -i DESIGN_DIAGRAMS.md -o DESIGN_DIAGRAMS_rendered.md
pandoc DESIGN_DIAGRAMS_rendered.md -o DESIGN_DIAGRAMS.pdf
```

**Solution 2:** Use an online tool that supports Mermaid
- https://mermaid.live/ - Export diagrams as SVG
- Insert SVG images back into markdown before converting

### Large File Size

**Solutions:**
- Compress images before including in markdown
- Use pandoc with compression options
- Split into multiple smaller PDFs

### Missing Fonts

**Solution:**
```bash
# Install additional fonts
sudo apt-get install fonts-liberation fonts-dejavu
```

---

## Automation Script (Complete Solution)

Create `generate-pdfs.sh`:
```bash
#!/bin/bash

echo "🚀 Starting PDF generation..."

# Create output directory
mkdir -p pdf-exports

# Files to convert
FILES=(
  "APP_DOCUMENTATION"
  "LISA_USER_GUIDE"
  "DESIGN_DIAGRAMS"
  "FEATURE_NAVIGATION_GUIDE"
  "TESTING_GUIDE"
  "LISA_COMMANDS"
  "LISA_LEARNING_SYSTEM"
)

# Convert each file
for file in "${FILES[@]}"
do
  echo "📄 Converting ${file}.md..."
  pandoc "${file}.md" -o "pdf-exports/${file}.pdf" \
    --pdf-engine=xelatex \
    -V geometry:margin=1in \
    -V fontsize=11pt \
    --toc \
    --toc-depth=3 \
    --highlight-style=tango
  
  if [ $? -eq 0 ]; then
    echo "✅ ${file}.pdf created successfully"
  else
    echo "❌ Error creating ${file}.pdf"
  fi
done

# Create ZIP archive
echo "📦 Creating archive..."
cd pdf-exports
zip -r ../app-documentation-$(date +%Y%m%d).zip *.pdf
cd ..

echo "✨ PDF generation complete!"
echo "📁 Files saved in: pdf-exports/"
echo "📦 Archive created: app-documentation-$(date +%Y%m%d).zip"
```

**Usage:**
```bash
chmod +x generate-pdfs.sh
./generate-pdfs.sh
```

---

## Best Practices

1. **Version Control:** Include date/version in PDF filename
2. **Regular Updates:** Regenerate PDFs when documentation changes
3. **Quality Check:** Review PDFs before distributing
4. **Metadata:** Add author, title, and creation date to PDFs
5. **Accessibility:** Ensure PDFs are searchable and have proper structure
6. **Backup:** Keep both .md and .pdf versions

---

## Summary

**Recommended for Most Users:** Method 1 (VS Code + Extension)
- Easy to use
- Good output quality
- No command line required

**Recommended for Developers:** Method 3 (Pandoc CLI)
- Scriptable and automatable
- Highly customizable
- Professional output

**Recommended for Teams:** Method 5 (GitHub Actions)
- Fully automated
- Always up-to-date
- No manual intervention needed

Choose the method that best fits your workflow and technical comfort level!
