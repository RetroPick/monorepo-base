# RetroPick - Android

RetroPick is a modern Android application for market analysis and trading insights, built with the latest Android technologies and Clean Architecture principles.

## 🚀 Features

- **Market Explorer**: Real-time market data visualization.
- **Advanced Charts**: Interactive financial charts using Vico.
- **Portfolio Management**: Track your trades and assets.
- **Alert System**: Real-time notifications for market movements.
- **Clean UI**: Modern design based on Material 3 and Jetpack Compose.

## 🛠 Tech Stack

- **UI**: Jetpack Compose, Material 3
- **Architecture**: Clean Architecture (Feature-based), MVVM
- **Dependency Injection**: Hilt
- **Networking**: Retrofit, OkHttp, Gson
- **Database**: Room
- **Async & Threading**: Kotlin Coroutines, Flow
- **Image Loading**: Coil
- **Charts**: Vico Charts
- **Background Tasks**: WorkManager
- **Push Notifications**: Firebase Cloud Messaging (FCM)

## 📁 Project Structure

The project follows a feature-based Clean Architecture structure:
- `core`: Shared components, utilities, and base design system.
- `data`: Repositories and data sources (Network/Local).
- `feature`: UI and ViewModels for specific app features (Auth, Home, Trade, etc.).
- `navigation`: App navigation logic using Compose Navigation.

## 🏗️ Getting Started

1. Clone the repository.
2. Open in Android Studio Hedgehog or newer.
3. Sync Gradle and run the app.

---
Developed as a high-performance trading companion.
