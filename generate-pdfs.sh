#!/bin/bash

# PDF Generation Script for Complete App Documentation
# This script converts all markdown documentation to PDF format

echo "🚀 Starting PDF generation for all documentation files..."
echo ""

# Create output directory
OUTPUT_DIR="pdf-documentation"
mkdir -p "$OUTPUT_DIR"

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if pandoc is installed
if ! command -v pandoc &> /dev/null; then
    echo -e "${RED}❌ Error: pandoc is not installed${NC}"
    echo ""
    echo "Please install pandoc first:"
    echo "  macOS:    brew install pandoc"
    echo "  Ubuntu:   sudo apt-get install pandoc"
    echo "  Windows:  choco install pandoc"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓ pandoc found${NC}"
echo ""

# List of documentation files to convert
FILES=(
    "MASTER_DOCUMENTATION"
    "APP_DOCUMENTATION"
    "LISA_USER_GUIDE"
    "DESIGN_DIAGRAMS"
    "FEATURE_NAVIGATION_GUIDE"
    "TESTING_GUIDE"
    "LISA_COMMANDS"
    "LISA_LEARNING_SYSTEM"
    "SEARCH_FEATURES"
    "FEATURE_ANNOUNCEMENTS"
    "PDF_EXPORT_GUIDE"
)

# Counter for successful conversions
SUCCESS_COUNT=0
FAIL_COUNT=0

# Convert each file
for file in "${FILES[@]}"
do
    INPUT_FILE="${file}.md"
    OUTPUT_FILE="${OUTPUT_DIR}/${file}.pdf"
    
    if [ -f "$INPUT_FILE" ]; then
        echo -e "${YELLOW}📄 Converting ${INPUT_FILE}...${NC}"
        
        pandoc "$INPUT_FILE" -o "$OUTPUT_FILE" \
            --pdf-engine=xelatex \
            -V geometry:margin=1in \
            -V fontsize=11pt \
            -V documentclass=article \
            -V colorlinks=true \
            -V linkcolor=blue \
            -V urlcolor=blue \
            -V toccolor=gray \
            --toc \
            --toc-depth=3 \
            --highlight-style=tango \
            --number-sections \
            2>/dev/null
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}   ✓ ${file}.pdf created successfully${NC}"
            SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        else
            echo -e "${RED}   ✗ Error creating ${file}.pdf${NC}"
            FAIL_COUNT=$((FAIL_COUNT + 1))
        fi
    else
        echo -e "${RED}   ✗ ${INPUT_FILE} not found, skipping${NC}"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
    echo ""
done

# Create a combined PDF of all documentation
echo -e "${YELLOW}📦 Creating combined documentation PDF...${NC}"
pandoc \
    MASTER_DOCUMENTATION.md \
    APP_DOCUMENTATION.md \
    LISA_USER_GUIDE.md \
    DESIGN_DIAGRAMS.md \
    FEATURE_NAVIGATION_GUIDE.md \
    TESTING_GUIDE.md \
    LISA_COMMANDS.md \
    LISA_LEARNING_SYSTEM.md \
    SEARCH_FEATURES.md \
    FEATURE_ANNOUNCEMENTS.md \
    PDF_EXPORT_GUIDE.md \
    -o "${OUTPUT_DIR}/COMPLETE_APP_DOCUMENTATION_ALL_IN_ONE.pdf" \
    --pdf-engine=xelatex \
    -V geometry:margin=1in \
    -V fontsize=11pt \
    -V documentclass=report \
    -V colorlinks=true \
    -V linkcolor=blue \
    --toc \
    --toc-depth=2 \
    --highlight-style=tango \
    --number-sections \
    2>/dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}   ✓ Combined PDF created successfully${NC}"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
else
    echo -e "${RED}   ✗ Error creating combined PDF${NC}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi
echo ""

# Create ZIP archive
echo -e "${YELLOW}📦 Creating ZIP archive...${NC}"
ARCHIVE_NAME="app-documentation-$(date +%Y%m%d-%H%M%S).zip"
cd "$OUTPUT_DIR"
zip -r "../${ARCHIVE_NAME}" *.pdf >/dev/null 2>&1
cd ..

if [ $? -eq 0 ]; then
    echo -e "${GREEN}   ✓ Archive created: ${ARCHIVE_NAME}${NC}"
else
    echo -e "${RED}   ✗ Error creating archive${NC}"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✨ PDF Generation Complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Summary:"
echo -e "   ${GREEN}✓ Successful: ${SUCCESS_COUNT}${NC}"
if [ $FAIL_COUNT -gt 0 ]; then
    echo -e "   ${RED}✗ Failed: ${FAIL_COUNT}${NC}"
fi
echo ""
echo "📁 Output:"
echo "   Directory: ./${OUTPUT_DIR}/"
echo "   Archive:   ./${ARCHIVE_NAME}"
echo ""
echo "📝 Files created:"
ls -lh "$OUTPUT_DIR"/*.pdf 2>/dev/null | awk '{printf "   %s  %s\n", $5, $9}'
echo ""
echo "🎉 Done! Check the ${OUTPUT_DIR} directory for your PDFs."
echo ""
