# Data Alchemist - AI Resource Allocation Configurator

## Description

Data Alchemist is an AI-powered Next.js web application designed to transform messy spreadsheet data (CSV or XLSX) into clean, validated, and actionable insights for resource allocation. It provides a comprehensive suite of tools for data ingestion, real-time validation, AI-driven data correction and rule generation, and flexible priority configuration. The goal is to bring order to complex data, making it easy for non-technical users to manage and prepare data for downstream allocation systems.

## Installation Instructions

To get a copy of this project up and running on your local machine, follow these steps:

1.  **Download the Project**:
    Download the project using GitHub CLI
    ```bash
    gh repo clone apoorvmaurya/data_alchemist
    ```
2.  **Navigate to the Project Directory**:
    Open your terminal or command prompt and change into the project's root directory:
    ```bash
    cd path/to/your/project
    ```
3.  **Install Dependencies**:
    This project uses `pnpm` as its package manager. If you don't have `pnpm` installed, you can install it globally:
    ```bash
    npm install -g pnpm
    ```
    Then, install the project dependencies:
    ```bash
    pnpm install
    ```
4.  **Environment Configuration**:
    Create a `.env.local` file in the root of your project by copying the `.env.example` file:
    ```bash
    cp .env.example .env.local
    ```
    Open `.env.local` and configure your OpenAI API key:
    ```
    NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here
    ```
    Replace `your_openai_api_key_here` with your actual OpenAI API key to enable AI features. If left unconfigured, AI features will use mock data.
5.  **Run the Development Server**:
    Start the development server:
    ```bash
    pnpm dev
    ```

## Usage Examples

Data Alchemist simplifies the process of cleaning, validating, and configuring data for resource allocation.

### 1. Uploading Data

Upload your client, worker, and task data in CSV or XLSX format. The application intelligently detects the entity type and maps headers, even if they are inconsistently named.

*   Click the "Upload Files" button in the header.
*   Select your `.csv` or `.xlsx` files.
*   The data will be parsed and displayed in the respective data tables.

### 2. Editing Data Inline

You can directly edit data within the tables. Changes trigger real-time validation.

*   Navigate to the "Data Management" tab.
*   Click on any cell in the table to enter edit mode.
*   Modify the value and press `Enter` to save, or `Escape` to cancel.

### 3. Data Validation and AI Suggestions

The "Validation" tab provides a summary of data issues and offers AI-powered suggestions for corrections.

*   Click the "Validate" button in the "Validation Results" panel to run a full validation.
*   Review errors, warnings, and info messages categorized by type or entity.
*   In the "AI Suggestions" tab, click "Generate" to get AI-powered correction recommendations.
*   Click "Apply" next to a suggestion to implement it (if supported).

### 4. Building Business Rules

Define custom business rules to govern resource allocation. You can add rules manually or leverage AI to generate them from natural language descriptions.

*   Go to the "AI Rules" tab.
*   **Manual Rule Creation**: Use the "Manual" sub-tab to select a rule type (e.g., Co-run, Load Limit) and define its parameters.
*   **AI-Generated Rules**: In the "AI Assistant" sub-tab, describe your rule in plain English (e.g., "Tasks T12 and T14 should always run together"). Click "Generate Rule" to convert it into a structured rule.
*   **AI Rule Recommendations**: In the "Recommendations" sub-tab, click "Analyze" to get AI-powered rule suggestions based on your data patterns.

### 5. Configuring Priorities

Adjust the importance of various allocation criteria using intuitive sliders.

*   Navigate to the "Priorities" tab.
*   Use the sliders to set weights for criteria like "Priority Level," "Task Fulfillment," "Fairness," etc.
*   You can also select from predefined presets like "Maximize Fulfillment" or "Fair Distribution."

### 6. AI Search

Query your loaded data using natural language.

*   In the header, type your query into the AI search bar (e.g., "tasks with duration > 2 phases").
*   Click the "Search" button.
*   AI-filtered results and an explanation will appear above the data tables.

### 7. Exporting Data and Rules

Once your data is clean and rules are configured, export them for downstream use.

*   Click the "Export" button in the header.
*   Cleaned client, worker, and task data will be downloaded as CSV files.
*   Your configured business rules and priority weights will be exported as a `allocation_config.json` file.

## Key Features

*   **Intelligent Data Ingestion**: Upload CSV and XLSX files for clients, workers, and tasks with AI-powered header mapping.
*   **Interactive Data Grid**: View and edit data directly within responsive tables, supporting inline modifications.
*   **Real-time Data Validation**: Comprehensive validation checks on data upload and inline edits, with immediate feedback and issue highlighting.
*   **AI-powered Validation Insights**: AI engine defines and runs broader validations, providing detailed error messages and suggestions.
*   **Natural Language AI Search**: Query your data using plain English to retrieve filtered results.
*   **Flexible Business Rule Builder**: Create and manage allocation rules manually or generate them from natural language descriptions using AI.
*   **AI Rule Recommendations**: Get AI-generated rule suggestions based on patterns detected in your data.
*   **Configurable Priority Weights**: Assign relative importance to various allocation criteria using sliders and presets.
*   **Performance Optimization**: Utilizes Web Workers for heavy data processing tasks and virtualization for large datasets.
*   **Responsive User Interface**: Designed with a mobile-first approach, ensuring a seamless experience across all screen sizes (XS, SM, MD, LG, XL).
*   **Data Export**: Export cleaned data (CSV) and a consolidated rules configuration (JSON) for integration with other systems.

## Technologies Used

This project leverages a modern web development stack to deliver a robust and responsive application:

*   **Frontend Framework**: [Next.js](https://nextjs.org/)
*   **UI Library**: [React](https://react.dev/)
*   **Language**: [TypeScript](https://www.typescriptlang.org/)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
*   **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
*   **Data Parsing**:
    *   [PapaParse](https://www.papaparse.com/)
    *   [XLSX](https://docs.sheetjs.com/)
*   **AI Integration**: [OpenAI API](https://openai.com/docs/api/)
*   **Performance**:
    *   Web Workers (custom `useWorker` hook)
    *   [react-window](https://react-window.vercel.app/)
*   **Toasts/Notifications**: [Sonner](https://sonner.emilkowalski.pl/)

## Contributing Guidelines

Contributions are welcome! If you'd like to contribute, please follow these steps:

1.  Fork the repository.
2.  Create a new branch for your feature or bug fix.
3.  Make your changes and ensure they adhere to the project's coding style.
4.  Write clear, concise commit messages.
5.  Submit a pull request with a detailed description of your changes.

## License

This project is open-sourced under the [MIT License](https://opensource.org/licenses/MIT).

## Contact Information

For any questions, suggestions, or issues, please feel free to reach out or open an issue.
