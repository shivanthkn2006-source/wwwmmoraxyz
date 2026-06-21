# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/b9030454-e916-4ad9-be10-f87ad69107c0

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/b9030454-e916-4ad9-be10-f87ad69107c0) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/b9030454-e916-4ad9-be10-f87ad69107c0) and click on Share -> Publish.

## 📚 Complete Documentation

This project includes comprehensive documentation covering all features, architecture, and usage.

### Quick Start Documentation

**⭐ Start Here**: [MASTER_DOCUMENTATION.md](./MASTER_DOCUMENTATION.md)
- Complete 20,000+ word comprehensive guide
- All features, technical details, and user guides in one place

**Documentation Index**: [DOCUMENTATION_README.md](./DOCUMENTATION_README.md)
- Overview of all 11 documentation files
- Quick start guides for different roles
- PDF generation instructions

### Documentation Files

1. **[MASTER_DOCUMENTATION.md](./MASTER_DOCUMENTATION.md)** - Complete comprehensive guide ⭐
2. **[APP_DOCUMENTATION.md](./APP_DOCUMENTATION.md)** - App features & UI/UX guide
3. **[LISA_USER_GUIDE.md](./LISA_USER_GUIDE.md)** - Lisa AI companion complete guide
4. **[DESIGN_DIAGRAMS.md](./DESIGN_DIAGRAMS.md)** - Visual architecture diagrams
5. **[FEATURE_NAVIGATION_GUIDE.md](./FEATURE_NAVIGATION_GUIDE.md)** - Feature locations
6. **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** - Testing procedures
7. **[LISA_COMMANDS.md](./LISA_COMMANDS.md)** - Voice command reference
8. **[LISA_LEARNING_SYSTEM.md](./LISA_LEARNING_SYSTEM.md)** - Learning system docs
9. **[SEARCH_FEATURES.md](./SEARCH_FEATURES.md)** - Search features guide
10. **[FEATURE_ANNOUNCEMENTS.md](./FEATURE_ANNOUNCEMENTS.md)** - Announcement system
11. **[PDF_EXPORT_GUIDE.md](./PDF_EXPORT_GUIDE.md)** - PDF generation methods

### Generate PDF Documentation

**Mac/Linux:**
```bash
chmod +x generate-pdfs.sh
./generate-pdfs.sh
```

**Windows:**
```cmd
generate-pdfs.bat
```

This creates:
- Individual PDFs for each document
- Combined "all-in-one" PDF
- Timestamped ZIP archive
- All files in `pdf-documentation/` folder

## Key Features

### Lisa AI Companion
- 🎤 Voice control throughout entire app
- 💬 AI chat with conversation memory
- 🎭 4 personality tones (Casual, Professional, Enthusiastic, Friendly)
- 📝 3 conversation styles (Concise, Balanced, Detailed)
- 🔔 Proactive notifications ("You haven't posted in 3 days")
- 📍 Friend online announcements with location
- 🧠 Adaptive learning system

### Social Features
- 📱 Posts (text, images, videos)
- 💬 Real-time direct messaging
- 👥 Friends system with requests
- 🎉 Huddle events by category
- 🔍 Advanced search with filters
- 🏆 Gamification (badges, challenges, leaderboard)

### Advanced Search
- Intelligent ranking algorithm
- Date, location, and type filters
- Search history & saved searches
- Trending searches dashboard
- Search analytics

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
