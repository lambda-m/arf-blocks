#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Define variables for the rsync parameters

RSYNC_CMD="rsync -avz --delete site/ lambda-m.nl:/var/www/htdocs/lambda-m.nl/arfblocks/"

# Function to check if a command exists
command_exists () {
    type "$1" &> /dev/null ;
}

# Ensure rsync is installed
if ! command_exists rsync; then
    echo "Error: rsync is not installed or not in the PATH."
    exit 1
fi

# Sync the generated files using rsync
echo "Syncing files to the server..."
$RSYNC_CMD

# Check if the rsync command succeeded
if [ $? -ne 0 ]; then
    echo "rsync failed. Aborting."
    exit 1
fi

echo "Deployment successful!"
