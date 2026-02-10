# Optimus - Visual Page Builder

## Project Overview

Optimus is a powerful, web-based visual builder designed for creating and managing mobile application pages with ease. It empowers users to build complex layouts by dragging and dropping pre-built widgets onto a canvas that provides a real-time preview of the final design on a simulated phone screen. This tool is ideal for marketing teams, content managers, and developers who need to rapidly create and iterate on mobile pages without writing code.

The application features a rich widget library with components like product carousels, banners, and grids. Each widget's properties can be customized through a dynamic property editor in the sidebar. The system is built on a modern frontend stack and includes a secure authentication system to ensure that only authorized users can access the builder.

## Tech Stack

*   **Frontend:** React, Vite, Tailwind CSS
*   **Drag & Drop:** @dnd-kit
*   **Linting:** ESLint
*   **Package Manager:** npm

## Features

*   **Drag-and-Drop Interface:** Easily arrange and reorder widgets on the page.
*   **Widget Library:** A collection of pre-built widgets like product carousels, banners, and grids.
*   **Real-time Preview:** See your changes instantly in a simulated phone frame (iOS/Android).
*   **Property Editor:** Configure the content and appearance of each widget.
*   **Authentication:** Secure login for authorized users.
*   **Responsive Design:** The layout is designed to work on different screen sizes.

## Project Structure
```
/
├── public/               # Static assets
├── src/
│   ├── assets/           # Image and other static assets
│   ├── components/       # React components
│   │   ├── Auth/         # Authentication components (e.g., LoginPage)
│   │   ├── Dashboard/    # Components for the main dashboard
│   │   ├── Layout/       # Main layout components (e.g., MainLayout)
│   │   ├── Pages/        # Page-level components
│   │   ├── Preview/      # Components for the phone preview
│   │   ├── Sidebar/      # Components for the sidebar editor
│   │   └── Widgets/      # All available widgets
│   ├── context/          # React context providers
│   ├── data/             # Static data (e.g., CSVs, JSON)
│   └── services/         # Application services (e.g., API calls)
├── .gitignore            # Git ignore file
├── index.html            # Main HTML file
├── package.json          # Project dependencies and scripts
└── vite.config.js        # Vite configuration
```

## Key Components

*   **`App.jsx`**: The root component that sets up the application's context providers.
*   **`MainLayout.jsx`**: The main layout of the application, including the header, sidebar, and preview area.
*   **`Sidebar.jsx`**: The container for the widget library and property editor.
*   **`WidgetLibrary.jsx`**: Allows users to select and add new widgets to the page.
*   **`PropertyEditor.jsx`**: A dynamic form for editing the properties of the selected widget.
*   **`PhoneFrame.jsx`**: Simulates a mobile phone screen for previewing the page layout.
*   **`WidgetRenderer.jsx`**: Renders the appropriate widget based on its type.
*   **`SortableWidget.jsx`**: A wrapper that makes widgets draggable and sortable.

## Getting Started

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Run the development server:**
    ```bash
    npm run dev
    ```
4.  Open your browser and navigate to `http://localhost:8888`.
