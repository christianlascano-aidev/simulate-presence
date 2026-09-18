# Use node alpine image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# Set environment to production
ENV NODE_ENV=production

# Expose the port
EXPOSE 8080

# Start the application
CMD ["npm", "start"]
