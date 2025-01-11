# Use the official Node.js image as a base
FROM node:16

# Set the working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the app source code
COPY . .

# Compile TypeScript
RUN npx tsc

# Expose the backend port
EXPOSE 3000

# Start the backend server
CMD ["npm", "start"]
