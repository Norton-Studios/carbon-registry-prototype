
# UK Land Carbon Registry Prototype

This prototype demonstrates a digital service for the UK Land Carbon Registry, built using the GOV.UK Prototype Kit with Scottish Government Design System components.

## About the Prototype

The prototype will need to demonstrate our approach to the following areas:

-   Approach to Know Your Customer checks 🚧
-   Project validation 🚧
-   Management of units issuing/transferring/retirement 🚧
-   Portfolio Management (specifically milestones, tasks, notifications, reporting) 🚧
-   Public view 🚧
-   Managing finances/invoicing 🚧
-   approach to support for users 🚧

## Technical Stack

-   **GOV.UK Prototype Kit** (v13.16.2) - Core framework for building the prototype
-   **Scottish Government Design System** (v3.0.0) - UI components and patterns
-   **Nunjucks** - Templating language for page layouts
-   **Node.js** - Runtime environment

## Project Structure

-   `/app/views/` - Contains the HTML templates for the service
-   `/app/assets/data/` - Contains JSON data files (e.g., projects.json)
-   `/app/routes.js` - Defines the application routes
-   `/app/config.json` - Configuration for the service name and other settings

## Key Features

-   Registry listing page with sortable project data
-   Individual project detail pages
-   Navigation between pages
-   Responsive design using Scottish Government Design System components

## Getting Started

### Prerequisites

-   Node.js (LTS version recommended)
-   npm (comes with Node.js)

### Installation

1.  Clone this repository
2.  Install dependencies:
    
    ```
    npm install
    
    ```
    
3.  Start the development server:
    
    ```
    npm run dev
    
    ```
    
4.  Visit `http://localhost:3000` in your browser

### Running in Production Mode

To run the prototype in production mode:

```
npm start

```

## Development

### Adding New Projects

Projects are stored in `/app/assets/data/projects.json`. To add new projects, update this file with the appropriate project details.

### Creating New Pages

1.  Create a new HTML file in the `/app/views/` directory
2.  Extend the main layout: `{% extends "/layouts/main.html" %}`
3.  Add the page to the routes in `/app/routes.js`

### Modifying Navigation

Update the navigation menu in `/app/views/layouts/main.html` by editing the `navigationMenu` object.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
