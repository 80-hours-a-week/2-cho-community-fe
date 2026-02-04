# 2-cho-community-fe

## Project Overview
This project is the frontend for the "AWS AI School 2nd Batch" community forum ("아무 말 대잔치"). It is a **Vanilla JavaScript** single-page-application (SPA) style project, served by a **FastAPI** (Python) backend wrapper.

The application follows a strict **MVC (Model-View-Controller)** architecture without using modern frontend frameworks like React or Vue. It relies on native DOM manipulation and modular CSS.

### Tech Stack
*   **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES Modules).
*   **Serving/Backend Wrapper:** Python 3.9+, FastAPI, Uvicorn.
*   **Tooling:** Node.js (for testing), Vitest (Unit Tests), Playwright (E2E Tests).
*   **Package Management:** `npm` (Node), `uv` (Python - implied by `uv.lock`).

## Architecture
The project structure enforces a clear separation of concerns using the MVC pattern.

### Directory Structure
*   `html/`: Static HTML templates for each page.
*   `css/`:
    *   `modules/`: Reusable component styles (buttons, cards, modals).
    *   `pages/`: Page-specific styles.
*   `js/`:
    *   `app/`: **Entry Points**. Each HTML page loads a specific file from here (e.g., `login.html` -> `login.js`). These initialize the controllers.
    *   `controllers/`: Business logic. Orchestrates data flow between Models and Views.
    *   `models/`: Data layer. Handles API communication (e.g., `AuthModel`, `PostModel`).
    *   `views/`: Presentation layer. Handles DOM manipulation and rendering.
    *   `services/`: Shared services like `ApiService` (HTTP client).
    *   `utils/`: Helper functions (formatting, validation, logging).

### Key Patterns
*   **Static Methods:** All methods in Models, Views, and Controllers are implemented as `static` methods.
*   **ApiService:** A centralized HTTP client (`js/services/ApiService.js`) handles:
    *   Authentication (headers, cookies).
    *   Automatic redirection to login on 401 errors.
    *   FormData and JSON request handling.
*   **XSS Prevention:** User-generated content is sanitized using `escapeHtml()` from `utils/` before rendering.
*   **Infinite Scroll:** Implemented using `IntersectionObserver` in the post list view.

## Getting Started

### Prerequisites
*   Node.js (for testing)
*   Python 3.9+ (for running the server)
*   `uv` (recommended for Python dependency management)

### Installation
1.  **Install Node.js dependencies:**
    ```bash
    npm install
    ```
2.  **Install Python dependencies:**
    ```bash
    # Assuming uv is installed
    uv sync
    # OR using pip
    pip install -r pyproject.toml # (may need manual dependency resolution if requirements.txt is missing)
    ```

### Running the Application
The frontend is served by the FastAPI application.

```bash
uv run uvicorn main:app --reload --port 8000
```
*   Access the app at: `http://localhost:8000`

## Testing
The project uses **Playwright** for end-to-end (E2E) testing. Unit tests are currently not implemented.

### Commands
*   **Run All Tests:** `npm test` (Runs E2E tests)
*   **E2E Tests (Playwright):**
    *   Run headless: `npm run test:e2e`
    *   Run with UI: `npm run test:e2e:ui`
    *   Debug mode: `npm run test:e2e:debug`

## Development Guidelines
1.  **MVC Strictness:** Do not mix logic. API calls belong in *Models*, DOM updates in *Views*, and logic/orchestration in *Controllers*.
2.  **Naming:**
    *   Files: `camelCase` (JS), `snake_case` (HTML/Python).
    *   Classes: `PascalCase` (e.g., `PostController`).
3.  **Styling:** Use the modular CSS files in `css/modules/` for reusable components before creating custom page styles.
4.  **Logging:** Use the `Logger` utility instead of `console.log` directly.
    ```javascript
    const logger = Logger.forContext('MyController');
    logger.info('Something happened');
    ```
