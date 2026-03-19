# RetroPick Landing Page

A modern, immersive landing page for RetroPick - a market prediction game with retro pixel art aesthetics.

![RetroPick Preview](./public/images/hero-city-bg.jpg)

## 🚀 Live Demo

**View the live site:** [https://ktxz6fgocdtp2.ok.kimi.link](https://ktxz6fgocdtp2.ok.kimi.link)

## ✨ Features

- **Retro Pixel Art Design** - 8-bit gaming aesthetic with neon blue/cyan colors
- **Scroll-Driven Animations** - GSAP ScrollTrigger powered pinned sections
- **Responsive Layout** - Works on desktop, tablet, and mobile devices
- **Modern Tech Stack** - React + TypeScript + Vite + Tailwind CSS

## 🛠️ Tech Stack

- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Animations:** GSAP + ScrollTrigger
- **Icons:** Lucide React

## 📁 Project Structure

```
retropick-landing/
├── public/
│   └── images/           # Static images (backgrounds, phone mockups, cards)
├── src/
│   ├── App.tsx          # Main application component
│   ├── index.css        # Global styles & Tailwind config
│   └── main.tsx         # Entry point
├── index.html           # HTML template
├── package.json         # Dependencies
├── tailwind.config.js   # Tailwind configuration
├── tsconfig.json        # TypeScript configuration
└── vite.config.ts       # Vite configuration
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/retropick-landing.git
   cd retropick-landing
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   ```

## 🎨 Customization

### Changing Colors

Edit the CSS variables in `src/index.css`:

```css
:root {
  --rp-accent: #00D4FF;        /* Primary accent color */
  --rp-bg-dark: #0B0C10;       /* Dark background */
  --rp-bg-light: #F4F6FA;      /* Light background */
}
```

### Updating Content

All section content is in `src/App.tsx`. Each section is clearly marked with comments.

### Replacing Images

Add your images to `public/images/` and update the paths in `src/App.tsx`.

## 📱 Sections

1. **Hero** - Main headline with phone mockup and stats
2. **How It Works** - 3-step process (Pick → Lock → Outcome)
3. **Features** - Market types (Direction, Level, Discovery)
4. **Benefits** - Key advantages with lifestyle image
5. **Closing CTA** - Call-to-action with decorative cards
6. **Contact** - App download and contact form
7. **Footer** - Links and copyright

## 🌐 Deployment

### GitHub Pages

1. Update `vite.config.ts` with your base URL:
   ```ts
   export default defineConfig({
     base: '/retropick-landing/',
     // ...
   })
   ```

2. Build and deploy:
   ```bash
   npm run build
   git add dist -f
   git commit -m "Deploy to GitHub Pages"
   git subtree push --prefix dist origin gh-pages
   ```

### Vercel / Netlify

Simply connect your GitHub repository to Vercel or Netlify for automatic deployments.

## 📄 License

MIT License - feel free to use this template for your own projects!

## 🙏 Credits

- Design inspired by Sport.Fun
- Images generated with AI
- Icons by Lucide React

---

**Version:** 1.0.0  
**Created:** March 2026
