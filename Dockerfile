# Use an official Node.js runtime as base image
FROM node:18-alpine

# Set working directory inside container
WORKDIR /usr/src/app

# Copy package.json and install dependencies
COPY package*.json ./

RUN npm install

# Copy the rest of the application files
COPY . .

# Expose the API port
EXPOSE 3000

# Start the app
CMD ["npm", "start"]
