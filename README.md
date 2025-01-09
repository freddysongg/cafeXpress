# cafeXpress

## Overview
cafeXpress is an AI-driven platform designed to connect café enthusiasts with the best local coffee shops based on their personal preferences, mood, and past visits. The recommendation engine leverages sentiment analysis from user reviews and integrates with external APIs like Google Places and Yelp Fusion API to suggest new cafés. Users can network with other café-goers, share café hopping itineraries, and rate their favorite spots.

## Features
- **AI-Powered Café Recommendations**: Utilizes NLP to analyze reviews and suggest venues tailored to user preferences.
- **Personalized Café Hopping Routes**: Generates optimized itineraries for café hopping based on location, time, and user interests.
- **User Profiles and Networking**: Allows users to connect with like-minded café enthusiasts and share routes or playlists.
- **Future Expansions**: Plans to integrate loyalty programs with cafés and event scheduling (e.g., café meetups).

## Tech Stack
- **Frontend**: React (deployed via Vercel)
- **Backend**: Node.js and Python (Flask)
- **Database**: PostgreSQL
- **APIs**: Google Places API, Yelp Fusion API

## Getting Started

### Prerequisites
- **Node.js**: v14 or higher
- **Python**: v3.6 or higher
- **PostgreSQL**: v12 or higher
- **pip**: for installing Python packages

### Installation

#### Backend Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/cafexpress.git
   cd cafexpress/backend
   ```
2. Create and activate a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use: .\venv\Scripts\activate
   ```
3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Set up your PostgreSQL database and update the database configuration in your backend settings.
5. Start the backend server:
   ```bash
   python app.py  # or your main entry file
   ```

#### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install frontend dependencies:
   ```bash
   npm install  # or pnpm install
   ```
3. Start the frontend development server:
   ```bash
   npm start  # or pnpm start
   ```

## Usage
1. Sign up or log in to your user account.
2. Explore café recommendations based on your preferences.
3. Create and share your café hopping itineraries.
4. Rate and review cafés you've visited.

## Contributing
We welcome contributions! Please follow these steps:

1. Fork the repository.
2. Create a new branch:
   ```bash
   git checkout -b feature/YourFeature
   ```
3. Make your changes and commit them:
   ```bash
   git commit -m "Add some feature"
   ```
4. Before pushing your changes, ensure you run the linting and formatting tools:
   ```bash
   pnpm lint
   pnpm format
   ```
5. Push to the branch:
   ```bash
   git push origin feature/YourFeature
   ```
6. Create a new Pull Request.

Note: We have linting and formatting protocols in place. Always run `pnpm lint` and `pnpm format` before pushing your changes to ensure consistent code style across the project.

## License
This project is licensed under the MIT License - see the LICENSE file for details.
