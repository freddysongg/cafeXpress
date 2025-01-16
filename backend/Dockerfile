# Use an official Node.js runtime (v20+) as a parent image
FROM --platform=linux/amd64 node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package files and install dependencies using npm
COPY package*.json ./
RUN npm install

# Copy the app source code
COPY . .

# Build the TypeScript code (ensure `tsc` is available in package.json scripts)
RUN npm run build

# Expose the backend port
EXPOSE 8000

# Start the backend server using npm
CMD ["npm", "run", "start"]
